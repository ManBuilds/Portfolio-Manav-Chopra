import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer, Html } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { gsap } from 'gsap';
import Experience from './Experience';
import ContactForm from './ContactForm';

// Bundled assets
import cardGLB from './card.glb?url';
import lanyardPng from './lanyard.png?url';

extend({ MeshLineGeometry, MeshLineMaterial });

// 1x1 transparent pixel — lets useTexture be called unconditionally when a
// front/back image isn't supplied.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas and the back face to the RIGHT half (measured from card.glb). Each
// custom image is composited into its own half so the two faces render
// independently, aspect-preserving (no stretching).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

// Dynamic canvas texture generators - Double Resolution (1024x1536) for maximum clarity
export const generateFrontCardDataURL = (portraitSrc) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d');

    // Background: Deep dark gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1536);
    gradient.addColorStop(0, '#0c0e10');
    gradient.addColorStop(0.5, '#121416');
    gradient.addColorStop(1, '#1a1c1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1536);

    // Tech mesh/grid patterns
    ctx.strokeStyle = 'rgba(255, 107, 0, 0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 1024; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1536); ctx.stroke();
    }
    for (let j = 0; j < 1536; j += 64) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(1024, j); ctx.stroke();
    }

    // Cyan highlight strip at the top
    ctx.fillStyle = '#ff6b00';
    ctx.fillRect(0, 0, 1024, 32);

    // Draw card inner border (wide)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, 72, 880, 1392);

    const drawText = () => {
      // Header logo text shifted below photo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 76px "Geist", "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MANAV CHOPRA', 512, 895);

      // Title / Subtitle shifted below photo
      ctx.fillStyle = '#ff6b00';
      ctx.font = 'bold 44px "JetBrains Mono", monospace';
      ctx.fillText('AI / ML STUDENT @ SRMIST', 512, 975);

      // Barcode text shifted up
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "JetBrains Mono", monospace';
      ctx.fillText('STUDENT ID: SRM-CSE-2028', 512, 1110);

      // Simple barcode graphic — centred on x=512
      ctx.fillStyle = '#ffffff';
      const barcodeY = 1150;
      const barcodeH = 60;
      const pattern = [2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 2, 4, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2];
      // Compute total width so we can centre it
      const totalBarcodeW = pattern.reduce((sum, w) => sum + w * 4 + 6, 0) - 6;
      let currentX = 512 - totalBarcodeW / 2;
      for (let w of pattern) {
        ctx.fillRect(currentX, barcodeY, w * 4, barcodeH);
        currentX += w * 4 + 6;
      }

      // Small divider line under barcode
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(300, 1260);
      ctx.lineTo(724, 1260);
      ctx.stroke();

      // Double tap hint under the divider line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText('DOUBLE TAP TO VIEW BACK', 512, 1315);

      resolve(canvas.toDataURL());
    };

    // Load portrait image (shifted up to 160)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      const rx = 192, ry = 160, rw = 640, rh = 640, radius = 48;
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, rx, ry, rw, rh);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 107, 0, 0.4)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, radius) : ctx.rect(rx, ry, rw, rh);
      ctx.stroke();

      drawText();
    };
    img.onerror = () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(192, 160, 640, 640);
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(192, 160, 640, 640);

      ctx.fillStyle = '#ff6b00';
      ctx.beginPath();
      ctx.arc(512, 380, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(512, 700, 200, Math.PI, 0);
      ctx.fill();

      drawText();
    };
    img.src = portraitSrc;
  });
};

export const generateBackCardDataURL = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');

  // Background: Deep dark gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 1536);
  gradient.addColorStop(0, '#0c0e10');
  gradient.addColorStop(0.5, '#121416');
  gradient.addColorStop(1, '#1a1c1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1536);

  ctx.strokeStyle = 'rgba(0, 242, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 1024; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1536); ctx.stroke();
  }
  for (let j = 0; j < 1536; j += 64) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(1024, j); ctx.stroke();
  }

  ctx.fillStyle = '#00f2ff';
  ctx.fillRect(0, 0, 1024, 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Geist", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CONNECT / SOCIALS', 512, 160);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80, 200); ctx.lineTo(944, 200); ctx.stroke();

  const socials = [
    { label: 'GITHUB', value: 'github.com/CodeKeeda9' },
    { label: 'LINKEDIN', value: 'linkedin.com/manav-chopra-97514b290' },
    { label: 'EMAIL', value: 'cmanav2006@gmail.com' },
    { label: 'PHONE', value: '+91 8826711318' }
  ];

  socials.forEach((s, idx) => {
    const startY = 340 + idx * 220;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(80, startY, 864, 170, 24) : ctx.rect(80, startY, 864, 170);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 38px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, 120, startY + 65);

    ctx.fillStyle = '#00f2ff';
    ctx.font = 'bold 46px "Inter", sans-serif';
    ctx.fillText(s.value, 120, startY + 125);

    // Circular button background on the right
    ctx.fillStyle = 'rgba(0, 242, 255, 0.08)';
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(840, startY + 85, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw up-right diagonal arrow icon
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(824, startY + 101);
    ctx.lineTo(856, startY + 69);
    ctx.moveTo(838, startY + 69);
    ctx.lineTo(856, startY + 69);
    ctx.lineTo(856, startY + 87);
    ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN CODE FOR COMPANION APP', 512, 1320);

  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(512, 1420, 40, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#00f2ff';
  ctx.beginPath();
  ctx.arc(512, 1420, 12, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
};


function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position: position, fov: fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1
}) {
  const [flipped, setFlipped] = useState(false);
  const lastClick = useRef(0);

  const band = useRef(),
    fixed = useRef(),
    j1 = useRef(),
    j2 = useRef(),
    j3 = useRef(),
    card = useRef();
  const vec = new THREE.Vector3(),
    ang = new THREE.Vector3(),
    rot = new THREE.Vector3(),
    dir = new THREE.Vector3();

  const tempQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempEuler = useMemo(() => new THREE.Euler(), []);

  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  const { nodes, materials } = useGLTF(cardGLB);
  const texture = useTexture(lanyardImage || lanyardPng);
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;
    if (!frontImage && !backImage) return baseMap;

    const baseImg = baseMap.image;
    const W = 2048;
    const H = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    ctx.drawImage(baseImg, 0, 0, W, H);

    const drawFitted = (img, rect) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    };

    if (frontImage && frontTex.image) drawFitted(frontTex.image, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.minFilter = THREE.LinearMipmapLinearFilter;
    composite.magFilter = THREE.LinearFilter;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      ang.copy(card.current.angvel());

      const r = card.current.rotation();
      tempQuat.set(r.x, r.y, r.z, r.w);
      tempEuler.setFromQuaternion(tempQuat, 'YXZ');

      const targetAngle = flipped ? Math.PI : 0;
      let diff = tempEuler.y - targetAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) > 0.02) {
        card.current.wakeUp();
      }
      card.current.setAngvel({ x: ang.x * 0.95, y: ang.y - diff * 8.0, z: ang.z * 0.95 });
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.96, 1.35, 0.01]} />
          <group
            scale={2.7}
            position={[0, -1.44, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={e => {
              e.target.setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));

              // Manual double-click detection
              const now = Date.now();
              if (now - lastClick.current < 250) {
                setFlipped(prev => {
                  const next = !prev;
                  card.current?.wakeUp();
                  return next;
                });
              }
              lastClick.current = now;
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Only trigger social links when flipped
              if (!flipped) return;
              if (e.uv) {
                const { x, y } = e.uv;
                // Back face boundaries on texture atlas: x in [0.5, 1.0], y in [0, 0.757]
                if (x >= 0.5 && x <= 1.0 && y >= 0 && y <= 0.757) {
                  // Normalize y relative to back face height
                  const localY = 1.0 - (y / 0.757);
                  const pixelY = localY * 1536;

                  // Redirect coordinates mapping
                  if (pixelY >= 340 && pixelY <= 510) {
                    window.open('https://github.com/CodeKeeda9', '_blank');
                  } else if (pixelY >= 560 && pixelY <= 730) {
                    window.open('https://www.linkedin.com/in/manav-chopra-97514b290/', '_blank');
                  } else if (pixelY >= 780 && pixelY <= 950) {
                    window.open('mailto:cmanav2006@gmail.com', '_self');
                  } else if (pixelY >= 1000 && pixelY <= 1170) {
                    window.open('tel:+918826711318', '_self');
                  }
                }
              }
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
    </>
  );
}

function FlowingMenu({
  items = [],
  speed = 15,
  textColor = '#fff',
  bgColor = '#120F17',
  marqueeBgColor = '#fff',
  marqueeTextColor = '#120F17',
  borderColor = '#fff'
}) {
  return (
    <div className="menu-wrap" style={{ backgroundColor: bgColor }}>
      <nav className="menu">
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            {...item}
            speed={speed}
            textColor={textColor}
            marqueeBgColor={marqueeBgColor}
            marqueeTextColor={marqueeTextColor}
            borderColor={borderColor}
          />
        ))}
      </nav>
    </div>
  );
}

function MenuItem({ link, text, image, speed, textColor, marqueeBgColor, marqueeTextColor, borderColor }) {
  const itemRef = useRef(null);
  const marqueeRef = useRef(null);
  const marqueeInnerRef = useRef(null);
  const animationRef = useRef(null);
  const [repetitions, setRepetitions] = useState(4);

  const animationDefaults = { duration: 0.6, ease: 'expo' };

  const findClosestEdge = (mouseX, mouseY, width, height) => {
    const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
    const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  };

  const distMetric = (x, y, x2, y2) => {
    const xDiff = x - x2;
    const yDiff = y - y2;
    return xDiff * xDiff + yDiff * yDiff;
  };

  useEffect(() => {
    const calculateRepetitions = () => {
      if (!marqueeInnerRef.current) return;

      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee__part');
      if (!marqueeContent) return;

      const contentWidth = marqueeContent.offsetWidth;
      const viewportWidth = window.innerWidth;

      const needed = Math.ceil(viewportWidth / contentWidth) + 2;
      setRepetitions(Math.max(4, needed));
    };

    calculateRepetitions();
    window.addEventListener('resize', calculateRepetitions);
    return () => window.removeEventListener('resize', calculateRepetitions);
  }, [text, image]);

  useEffect(() => {
    const setupMarquee = () => {
      if (!marqueeInnerRef.current) return;

      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee__part');
      if (!marqueeContent) return;

      const contentWidth = marqueeContent.offsetWidth;
      if (contentWidth === 0) return;

      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to(marqueeInnerRef.current, {
        x: -contentWidth,
        duration: speed,
        ease: 'none',
        repeat: -1
      });
    };

    const timer = setTimeout(setupMarquee, 50);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [text, image, repetitions, speed]);

  const handleMouseEnter = ev => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  };

  const handleMouseLeave = ev => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  };

  return (
    <div className="menu__item" ref={itemRef} style={{ borderColor }}>
      <a
        className="menu__item-link"
        href={link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ color: textColor }}
      >
        {text}
      </a>
      <div className="marquee" ref={marqueeRef} style={{ backgroundColor: marqueeBgColor }}>
        <div className="marquee__inner-wrap">
          <div className="marquee__inner" ref={marqueeInnerRef} aria-hidden="true">
            {[...Array(repetitions)].map((_, idx) => (
              <div className="marquee__part" key={idx} style={{ color: marqueeTextColor }}>
                <span>{text}</span>
                <div className="marquee__img" style={{ backgroundImage: `url(${image})` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveCloud() {
  const tags = useMemo(() => [
    { text: 'Python', icon: 'terminal' },
    { text: 'Java', icon: 'coffee' },
    { text: 'C++', icon: 'code' },
    { text: 'JavaScript', icon: 'javascript' },
    { text: 'HTML', icon: 'html' },
    { text: 'CSS', icon: 'css' },
    { text: 'React', icon: 'code' },
    { text: 'Flask', icon: 'science' },
    { text: 'Pandas', icon: 'analytics' },
    { text: 'NumPy', icon: 'query_stats' },
    { text: 'MongoDB', icon: 'database' },
    { text: 'MySQL', icon: 'database' }
  ], []);

  // Calculate Fibonacci sphere positions
  const radius = 3.6;
  const count = tags.length;
  const positions = useMemo(() => {
    const coords = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      coords.push([x, y, z]);
    }
    return coords;
  }, [count]);

  // Constellation lines
  const lines = useMemo(() => {
    const segments = [];
    for (let i = 0; i < count; i++) {
      const dists = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dists.push({ idx: j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      // Connect to the 2 closest neighbors
      segments.push([positions[i], positions[dists[0].idx]]);
      segments.push([positions[i], positions[dists[1].idx]]);
    }
    return segments;
  }, [positions, count]);

  const rotationRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    isDragging.current = true;
    previousPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousPointer.current.x;
    const deltaY = e.clientY - previousPointer.current.y;
    rotationRef.current.y = deltaX * 0.008;
    rotationRef.current.x = deltaY * 0.008;
    previousPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[550px] flex flex-col items-center justify-center">
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing relative select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <Canvas camera={{ position: [0, 0, 9], fov: 60 }} gl={{ alpha: true }}>
          <ambientLight intensity={Math.PI} />
          <CloudSphere tags={tags} positions={positions} lines={lines} dragRotation={rotationRef} isDragging={isDragging} />
        </Canvas>
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.25em] opacity-40 mt-4 text-center pointer-events-none">
        🖱️ Drag to explore stack
      </div>
    </div>
  );
}

function CloudSphere({ tags, positions, lines, dragRotation, isDragging }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (!isDragging.current && groupRef.current) {
      // Auto-rotation when not dragged
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x += delta * 0.05;
    } else if (groupRef.current) {
      // Interpolate to drag values
      groupRef.current.rotation.y += dragRotation.current.y;
      groupRef.current.rotation.x += dragRotation.current.x;
      // Decay drag speed
      dragRotation.current.x *= 0.95;
      dragRotation.current.y *= 0.95;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Network Constellation Lines */}
      {lines.map((line, idx) => (
        <LineSegment key={idx} start={line[0]} end={line[1]} />
      ))}

      {/* Tag HTML Nodes */}
      {tags.map((tag, idx) => (
        <group key={idx} position={positions[idx]}>
          <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="glass-panel px-4 py-2 rounded-xl border border-white/5 shadow-2xl flex items-center gap-2 font-mono text-xs md:text-sm text-white font-bold select-none whitespace-nowrap bg-[#131313]/90 machined-edge">
              <span className="material-symbols-outlined text-[#ff6b00] text-[16px]">{tag.icon}</span>
              <span>{tag.text}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function LineSegment({ start, end }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#ff6b00" opacity={0.12} transparent linewidth={1} />
    </line>
  );
}

export default function App() {
  const [currentTime, setCurrentTime] = useState('12:37 AM');
  const [lanyardKey, setLanyardKey] = useState(0);
  const [cardTextures, setCardTextures] = useState({ front: null, back: null });

  const stackItems = useMemo(() => [
    { link: '#', text: 'Python', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60' },
    { link: '#', text: 'Java', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60' },
    { link: '#', text: 'JavaScript', image: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=600&auto=format&fit=crop&q=60' },
    { link: '#', text: 'React', image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60' },
    { link: '#', text: 'Flask', image: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&auto=format&fit=crop&q=60' }
  ], []);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [activeSection, setActiveSection] = useState('home');
  const [scrollY, setScrollY] = useState(0);

  // Scroll listener for parallax tags and active nav section
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      const sections = ['home', 'stack', 'projects', 'experience', 'achievements', 'contact'];
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pre-generate dynamic canvas textures for the Lanyard card
  useEffect(() => {
    const portraitUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdm4R2MivJb5aXkKuwxfxPKRwN0qrY0xnS2k8eFCJtiWZTeCV858-XMcgMRWkNlDZQsgFj-farlqjsGTWLZMmT6rwuI_G7SuyHLzCbNFHsQUQTCNszVvR5adhFGFUol1ijXHqGtwBzvZUekmpeoUcat2GBDPe81a244skDBFcnzt5eo4s0PMfHYnPSelC6qOhDLRGBb7NXlVN6iPzmlwmN_DdbD09krqxc8RQ9FhGcIaa28FrasE2ppygZnj-48gY84U-n3og18A';

    Promise.all([
      generateFrontCardDataURL(portraitUrl),
      generateBackCardDataURL()
    ]).then(([frontDataUrl, backDataUrl]) => {
      setCardTextures({ front: frontDataUrl, back: backDataUrl });
    });
  }, []);

  // Trigger physics drop of lanyard
  const triggerLanyardDrop = () => {
    setLanyardKey(prev => prev + 1);
  };

  // IntersectionObserver to auto-drop lanyard on scroll into Contact section
  useEffect(() => {
    const contactSection = document.getElementById('contact');
    if (!contactSection) return;

    let hasDropped = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasDropped) {
          triggerLanyardDrop();
          hasDropped = true;
        }
      });
    }, { threshold: 0.15 });

    observer.observe(contactSection);
    return () => observer.disconnect();
  }, []);

  const handleNavLinkClick = (e, targetId) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    if (targetId === 'contact') {
      triggerLanyardDrop();
    }
  };

  return (
    <div className="bg-[#0c0e10] text-[#e2e2e5] relative select-none">
      <div className="noise-overlay"></div>

      {/* TopNavBar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl rounded-2xl machined-edge bg-[#131313]/80 backdrop-blur-2xl flex justify-between items-center px-8 py-4 z-50 shadow-2xl">
        <div className="font-geist font-bold text-2xl tracking-tighter text-[#ff6b00]">MANAV CHOPRA</div>
        <div className="hidden md:flex gap-10">
          <a className={`${activeSection === 'home' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'home')}>HOME</a>
          <a className={`${activeSection === 'stack' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'stack')}>STACK</a>
          <a className={`${activeSection === 'projects' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'projects')}>PROJECTS</a>
          <a className={`${activeSection === 'experience' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'experience')}>EXPERIENCE</a>
          <a className={`${activeSection === 'achievements' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'achievements')}>ACHIEVEMENTS</a>
          <a className={`${activeSection === 'contact' ? 'text-[#ff6b00] font-bold border-b-2 border-[#ff6b00]' : 'text-on-surface-variant font-medium'} text-sm tracking-widest hover:text-[#ff6b00] transition-all cursor-pointer pb-1`} onClick={(e) => handleNavLinkClick(e, 'contact')}>CONTACT</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="primary-machined-button px-6 py-2 rounded-xl text-[#351000] font-mono text-xs font-bold uppercase tracking-tighter no-underline">Resume</a>
        </div>
      </nav>

      {/* SideNavBar (Dock) */}
      <aside className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 rounded-[2rem] machined-edge w-20 bg-surface-container/40 backdrop-blur-3xl flex-col items-center py-10 space-y-10 z-50">
        <div className="relative group">
          <div className="w-12 h-12 rounded-2xl border border-white/10 p-0.5 overflow-hidden machined-edge bg-surface">
            <img alt="Manav Portrait" className="w-full h-full object-cover rounded-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdm4R2MivJb5aXkKuwxfxPKRwN0qrY0xnS2k8eFCJtiWZTeCV858-XMcgMRWkNlDZQsgFj-farlqjsGTWLZMmT6rwuI_G7SuyHLzCbNFHsQUQTCNszVvR5adhFGFUol1ijXHqGtwBzvZUekmpeoUcat2GBDPe81a244skDBFcnzt5eo4s0PMfHYnPSelC6qOhDLRGBb7NXlVN6iPzmlwmN_DdbD09krqxc8RQ9FhGcIaa28FrasE2ppygZnj-48gY84U-n3og18A" />
          </div>
        </div>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'home' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'home')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Start</span>
        </a>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'stack' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'stack')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'stack' ? "'FILL' 1" : "'FILL' 0" }}>layers</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Systems</span>
        </a>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'projects' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'projects')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'projects' ? "'FILL' 1" : "'FILL' 0" }}>work</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Work</span>
        </a>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'experience' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'experience')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'experience' ? "'FILL' 1" : "'FILL' 0" }}>trending_up</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Exp</span>
        </a>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'achievements' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'achievements')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'achievements' ? "'FILL' 1" : "'FILL' 0" }}>military_tech</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Honors</span>
        </a>
        <a className={`p-3 rounded-2xl transition-all group relative cursor-pointer ${activeSection === 'contact' ? 'text-[#ff6b00] bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`} onClick={(e) => handleNavLinkClick(e, 'contact')}>
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: activeSection === 'contact' ? "'FILL' 1" : "'FILL' 0" }}>mail</span>
          <span className="absolute left-20 bg-surface-container-high px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Connect</span>
        </a>
      </aside>

      <main className="mesh-gradient spatial-grid">
        {/* Hero Section */}
        <section className="min-h-screen relative flex flex-col justify-center items-center pt-32 pb-40 px-6" id="home">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#ff6b00]/5 rounded-full blur-[150px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[150px]"></div>
          </div>
          <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
            <div className="mb-12 text-center z-10">
              <div className="mb-8 inline-flex items-center gap-4 px-6 py-2 rounded-full glass-panel machined-edge">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b00] animate-pulse shadow-[0_0_15px_#ff6b00]"></span>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff6b00]">B.TECH CSE (AI &amp; ML) STUDENT @ SRMIST</span>
              </div>
              <h1 className="font-geist text-5xl md:text-8xl text-white tracking-tighter leading-[0.95] max-w-5xl mx-auto md:text-9xl font-extrabold">
                Engineering <span className="text-[#ff6b00]">Impact</span> Solving &amp; <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-[#ff6b00] to-secondary">AI/ML</span> Solutions
              </h1>
              <p className="font-body-lg text-lg text-on-surface-variant max-w-2xl mx-auto mt-8 leading-relaxed">
                Focused on web application development, API integration, and delivering creative solutions with strong foundations in computer science.
              </p>
            </div>
            <div className="relative w-full max-w-5xl h-[600px] flex items-center justify-center">
              {/* Focal Point Image */}
              <div className="relative z-20 w-80 md:w-[450px] drop-shadow-[0_40px_80px_rgba(255,107,0,0.25)] transition-transform hover:scale-[1.02] duration-500 rounded-[2.5rem] overflow-hidden machined-edge border-2 border-white/10">
                <img alt="Manav Chopra professional portrait" className="w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdm4R2MivJb5aXkKuwxfxPKRwN0qrY0xnS2k8eFCJtiWZTeCV858-XMcgMRWkNlDZQsgFj-farlqjsGTWLZMmT6rwuI_G7SuyHLzCbNFHsQUQTCNszVvR5adhFGFUol1ijXHqGtwBzvZUekmpeoUcat2GBDPe81a244skDBFcnzt5eo4s0PMfHYnPSelC6qOhDLRGBb7NXlVN6iPzmlwmN_DdbD09krqxc8RQ9FhGcIaa28FrasE2ppygZnj-48gY84U-n3og18A" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none"></div>
              </div>
              {/* Floating Tech Plates */}
              <div className="absolute top-[15%] left-[12%] glass-panel px-6 py-3 rounded-2xl machined-edge flex items-center gap-3 tech-tag z-30"
                style={{ transform: `translateY(${scrollY * -0.15}px) rotate(-6deg)` }}>
                <span className="material-symbols-outlined text-[#ff6b00]">terminal</span>
                <span className="font-mono text-sm md:text-lg text-white tracking-tight font-bold">Python</span>
              </div>
              <div className="absolute bottom-[25%] left-[5%] glass-panel px-6 py-3 rounded-2xl machined-edge flex items-center gap-3 tech-tag z-10 opacity-80"
                style={{ transform: `translateY(${scrollY * 0.12}px) rotate(3deg)` }}>
                <span className="material-symbols-outlined text-[#ff6b00]">code</span>
                <span className="font-mono text-sm md:text-lg text-white tracking-tight font-bold">React</span>
              </div>
              <div className="absolute top-[20%] right-[10%] glass-panel px-6 py-3 rounded-2xl machined-edge flex items-center gap-3 tech-tag z-30"
                style={{ transform: `translateY(${scrollY * -0.2}px) rotate(6deg)` }}>
                <span className="material-symbols-outlined text-[#ff6b00]">javascript</span>
                <span className="font-mono text-sm md:text-lg text-white tracking-tight font-bold">JavaScript</span>
              </div>
              <div className="absolute bottom-[15%] right-[12%] glass-panel px-6 py-3 rounded-2xl machined-edge flex items-center gap-3 tech-tag z-30"
                style={{ transform: `translateY(${scrollY * 0.08}px) rotate(-3deg)` }}>
                <span className="material-symbols-outlined text-[#ff6b00]">database</span>
                <span className="font-mono text-sm md:text-lg text-white tracking-tight font-bold">MongoDB</span>
              </div>
              <div className="absolute top-1/2 right-[0%] -translate-y-1/2 glass-panel px-6 py-3 rounded-2xl machined-edge flex items-center gap-3 tech-tag z-10 opacity-60"
                style={{ transform: `translateY(${scrollY * -0.1}px) rotate(12deg)` }}>
                <span className="material-symbols-outlined text-[#ff6b00]">coffee</span>
                <span className="font-mono text-sm md:text-lg text-white tracking-tight font-bold">Java</span>
              </div>
            </div>
            <div className="mt-16 flex flex-wrap gap-8 items-center justify-center z-10">
              <a className="primary-machined-button px-10 py-5 rounded-2xl font-geist font-bold text-on-primary-fixed flex items-center gap-4 group cursor-pointer" onClick={(e) => handleNavLinkClick(e, 'projects')}>
                <span className="text-sm tracking-widest">SEE PORTFOLIO</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
              <a className="machined-button px-10 py-5 rounded-2xl font-geist font-bold text-on-surface flex items-center gap-4 group cursor-pointer" onClick={(e) => handleNavLinkClick(e, 'stack')}>
                <span className="text-sm tracking-widest text-on-surface-variant group-hover:text-[#ff6b00] transition-colors">VIEW STACK</span>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">keyboard_double_arrow_down</span>
                </div>
              </a>
            </div>
          </div>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase">Scroll</span>
            <div className="w-px h-16 bg-gradient-to-b from-[#ff6b00] to-transparent"></div>
          </div>
        </section>

        {/* Core Stack Section */}
        <section className="py-40 px-6 lg:px-40 relative" id="stack">
          <div className="max-w-7xl mx-auto">
            {/* Centred section badge — same pattern as 02 / 03 */}
            <div className="text-center mb-20">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
                <span className="font-mono text-xs text-[#ff6b00] tracking-[0.3em] uppercase">01 / Core Stack</span>
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
              </div>
              <h2 className="font-geist text-5xl md:text-7xl leading-none tracking-tight">
                Skills that <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] via-white to-[#ed9000]">drive results.</span>
              </h2>
              <p className="font-body-lg text-lg text-on-surface-variant mt-6 leading-relaxed">
                Focused on structured programming languages, standard data libraries, databases, and responsive web frameworks.
              </p>
              <div className="w-12 h-1 bg-[#ff6b00]/30 mx-auto rounded-full mt-6"></div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-24 items-center">
            <div className="w-full lg:w-1/2">
              <div className="relative h-[480px] w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 glass-panel shadow-2xl">
                <FlowingMenu
                  items={stackItems}
                  speed={12}
                  bgColor="transparent"
                  textColor="#e2e2e5"
                  marqueeBgColor="#ff6b00"
                  marqueeTextColor="#0c0e10"
                  borderColor="rgba(255, 255, 255, 0.08)"
                />
              </div>
            </div>
            <div className="w-full lg:w-1/2 flex items-center justify-center">
              <div className="w-full max-w-[700px]">
                <InteractiveCloud />
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider 2→3 */}
        <div className="flex items-center justify-center gap-6 px-40">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]/40"></div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
        </div>

        {/* Projects Section */}
        <section className="py-40 px-6 lg:px-40 relative" id="projects">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
                <span className="font-mono text-xs text-[#ff6b00] tracking-[0.3em] uppercase">02 / Projects</span>
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
              </div>
              <h2 className="font-geist text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                Selected <span className="text-[#ff6b00]">Applications</span>
              </h2>
              <div className="w-12 h-1 bg-[#ff6b00]/30 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Project 1 */}
              <div className="project-card rounded-[3rem] p-10 flex flex-col group transition-all duration-500 hover:-translate-y-4 hover:border-[#ff6b00]/20">
                <div className="flex justify-between items-start mb-8">
                  <span className="font-geist text-6xl font-bold text-white/90">01</span>
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">AI &amp; Location</span>
                </div>
                <h3 className="font-geist text-3xl font-bold text-white mb-4">Raaste App</h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6 leading-relaxed">
                  An AI-integrated bus tracking application offering real-time public transport updates and optimized route guidance. Reduces route lookup time by 40% and supports low-bandwidth users.
                </p>
                <div className="mb-6 mt-auto">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff6b00] mb-2">Techstack used</p>
                  <p className="font-mono text-sm text-on-surface-variant leading-relaxed">Python · JavaScript · HTML · CSS · APIs</p>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                  <img alt="Raaste App Preview" className="w-full aspect-[4/3] object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7oCCfkuQQY2LPO3ezcnXv3y0LwODUioYJDL8Q_9a0Yzjtq0OeteU7acXp7LjG4YEWKfmFpqaSOx2Rsdgowuofe8xoN6NZF4Ym8wDgux6uo9UDtICv55AABHRCwPPxsxIt3LCaMs5lwcOvI3NwQxSQU_4tsYExF93eY6qV-hwqNCSg3tg_IDtRKcssyDRUwxSHpJRYDrX5w5OabYOYO7gsazO3K9dZHsaSPY5QE8hG2B-r9zvxhpcA46CqLilpzd5DDMK1m7U3NQ" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <button className="w-full py-3 bg-[#ff6b00] text-[#351000] font-geist font-bold rounded-xl text-sm tracking-widest uppercase">View Details</button>
                  </div>
                </div>
              </div>
              {/* Project 2 */}
              <div className="project-card rounded-[3rem] p-10 flex flex-col group transition-all duration-500 hover:-translate-y-4 hover:border-[#ff6b00]/20">
                <div className="flex justify-between items-start mb-8">
                  <span className="font-geist text-6xl font-bold text-white/90">02</span>
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">React &amp; DB</span>
                </div>
                <h3 className="font-geist text-3xl font-bold text-white mb-4">Study Buddy</h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6 leading-relaxed">
                  A collaborative learning app that connects students with study partners using a Tinder-style swipe system. Integrated an AI chatbot named Compiler, personalized recommendations, and dynamic schedules.
                </p>
                <div className="mb-6 mt-auto">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff6b00] mb-2">Techstack used</p>
                  <p className="font-mono text-sm text-on-surface-variant leading-relaxed">React · JavaScript · MongoDB</p>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                  <img alt="Study Buddy Preview" className="w-full aspect-[4/3] object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZEi_mAxZ6KIF8hClMjpQdpPCUgG10gaLVEdQ41zmNXGcl9LSJYSF_6CgjvfklH0n98vFErvodB3ib5WKOQ63DCsW7Qssdf6ScLEJVAO8lsAxTNpLG9qieQQAXx-v-0cy0m9j5TsWMjrubTAqhz1Bzsly_Qz0_yvlzEZW_0Sj4E9qjhCAweFv31KQfANg74mbZQBB202gZ3lb54DAM3tZh4gLLOynnGV5GnHU2uGGloL76LIu4XhFtYkEueJRF3-O4ZeBu-MI--Q" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <button className="w-full py-3 bg-[#ff6b00] text-[#351000] font-geist font-bold rounded-xl text-sm tracking-widest uppercase">View Details</button>
                  </div>
                </div>
              </div>
              {/* Project 3 */}
              <div className="project-card rounded-[3rem] p-10 flex flex-col group transition-all duration-500 hover:-translate-y-4 hover:border-[#ff6b00]/20">
                <div className="flex justify-between items-start mb-8">
                  <span className="font-geist text-6xl font-bold text-white/90">03</span>
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">AI/Backend</span>
                </div>
                <h3 className="font-geist text-3xl font-bold text-white mb-4">A.S.T.R.A</h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6 leading-relaxed">
                  Advanced Strategic Technology and Research Assistant. A powerful personal AI backend with real-time web search, vector-based memory, and intelligent conversation powered by Groq's high-speed LLMs.
                </p>
                <div className="mb-6 mt-auto">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff6b00] mb-2">Techstack used</p>
                  <p className="font-mono text-sm text-on-surface-variant leading-relaxed">FastAPI · Python · Groq · FAISS · Tavily API</p>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-[#ff6b00]/10 via-transparent to-[#0c0e10]">
                  <div className="w-full aspect-[4/3] flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-6xl text-[#ff6b00] block mb-4">smart_toy</span>
                      <p className="font-geist text-lg font-bold text-[#ff6b00]">AI-Powered Assistant</p>
                      <p className="font-mono text-xs text-on-surface-variant mt-2">FastAPI + LLM Backend</p>
                    </div>
                  </div>
                  <a href="https://github.com/ManBuilds/A.S.T.R.A---Advanced-Strategic-Technology-and-Research-Assistant" target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <button className="w-full py-3 bg-[#ff6b00] text-[#351000] font-geist font-bold rounded-xl text-sm tracking-widest uppercase hover:bg-[#ff8533] transition-colors">View on GitHub</button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider 3→4 */}
        <div className="flex items-center justify-center gap-6 px-40">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]/40"></div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
        </div>

        {/* Experience Section */}
        <Experience />

        {/* Section Divider 4→5 */}
        <div className="flex items-center justify-center gap-6 px-40">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]/40"></div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
        </div>

        {/* Hackathons & Achievements Section */}
        <section className="py-40 px-6 lg:px-40 relative bg-[#131313]/20" id="achievements">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
                <span className="font-mono text-xs text-[#ff6b00] tracking-[0.3em] uppercase">04 / Achievements &amp; Honors</span>
                <div className="h-px w-10 bg-[#ff6b00]/20"></div>
              </div>
              <h2 className="font-geist text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                Milestones &amp; <span className="text-[#ff6b00]">Certificates</span>
              </h2>
              <div className="w-12 h-1 bg-[#ff6b00]/30 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Column: Hackathons & Roles */}
              <div className="space-y-8">
                <h3 className="font-geist text-3xl font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#ff6b00]">workspace_premium</span>
                  Hackathons &amp; Activities
                </h3>

                <div className="space-y-6">
                  <div className="glass-panel machined-edge p-6 rounded-2xl relative overflow-hidden">
                    <span className="absolute top-0 right-0 bg-[#ff6b00]/10 text-[#ff6b00] font-mono text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider font-bold">1st Runner-Up</span>
                    <h4 className="font-geist text-lg font-bold text-white mb-2">Silent Syntax SRM NCR (2026)</h4>
                    <p className="font-body-md text-sm text-on-surface-variant">
                      Secured 2nd place in a competitive hackathon by developing Sentinel AI - Redaction Engine utilizing DOM Manipulation and advanced event handling scripts.
                    </p>
                  </div>

                  <div className="glass-panel machined-edge p-6 rounded-2xl">
                    <h4 className="font-geist text-lg font-bold text-white mb-2">Smart India Hackathon (2025)</h4>
                    <p className="font-body-md text-sm text-on-surface-variant">
                      Selected among the top 50 teams nationwide, pitching and architecting high-impact solution frameworks.
                    </p>
                  </div>

                  <div className="glass-panel machined-edge p-6 rounded-2xl">
                    <h4 className="font-geist text-lg font-bold text-white mb-2">LeetCode &amp; HackerRank Badges</h4>
                    <p className="font-body-md text-sm text-[#ff6b00] font-mono text-xs">
                      5-Star Badges in Python &amp; Java on HackerRank · Solved 100+ LeetCode problems
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Certifications */}
              <div className="space-y-8">
                <h3 className="font-geist text-3xl font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00f2ff]">verified</span>
                  Verifications &amp; Certs
                </h3>

                <div className="space-y-4">
                  <div className="interactive-plate p-5 rounded-2xl flex justify-between items-center transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="font-geist text-lg font-bold text-white">Certification of Java</span>
                      <span className="font-mono text-xs text-on-surface-variant">Mastering the Fundamentals — Scalar</span>
                    </div>
                    <span className="material-symbols-outlined text-[#00f2ff]">award_star</span>
                  </div>

                  <div className="interactive-plate p-5 rounded-2xl flex justify-between items-center transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="font-geist text-lg font-bold text-white">IBM SkillsBuild Certified</span>
                      <span className="font-mono text-xs text-on-surface-variant">AI Explorer — IBM</span>
                    </div>
                    <span className="material-symbols-outlined text-[#00f2ff]">award_star</span>
                  </div>

                  <div className="interactive-plate p-5 rounded-2xl flex justify-between items-center transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="font-geist text-lg font-bold text-white">Career Essentials in Gen AI</span>
                      <span className="font-mono text-xs text-on-surface-variant">Microsoft and LinkedIn</span>
                    </div>
                    <span className="material-symbols-outlined text-[#00f2ff]">award_star</span>
                  </div>

                  <div className="interactive-plate p-5 rounded-2xl flex justify-between items-center transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="font-geist text-lg font-bold text-white">Certification of Gen AI</span>
                      <span className="font-mono text-xs text-on-surface-variant">NASSCOM</span>
                    </div>
                    <span className="material-symbols-outlined text-[#00f2ff]">award_star</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider 4→5 */}
        <div className="flex items-center justify-center gap-6 px-40">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]/40"></div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#ff6b00]/20 to-[#ff6b00]/40"></div>
        </div>

        {/* Contact & Connect Section */}
        <section className="py-40 px-6 lg:px-40 bg-surface-container-lowest/50" id="contact">
          {/* Centred section badge — same pattern as 02 / 03 */}
          <div className="max-w-7xl mx-auto text-center mb-20">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 bg-[#ff6b00]/20"></div>
              <span className="font-mono text-xs text-[#ff6b00] tracking-[0.3em] uppercase">05 / Let's Connect</span>
              <div className="h-px w-10 bg-[#ff6b00]/20"></div>
            </div>
            <div className="w-12 h-1 bg-[#ff6b00]/30 mx-auto rounded-full"></div>
          </div>
          {/* Header block spanning full width to keep it on one line */}
          <div className="max-w-7xl mx-auto mb-16 text-center lg:text-left">
            <h2 className="font-geist text-4xl md:text-6xl lg:text-7xl leading-tight tracking-tight lg:whitespace-nowrap">
              Let's build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#ff6b00]" onClick={triggerLanyardDrop} style={{ cursor: 'pointer' }}>impactful.</span>
            </h2>
            <div className="flex justify-center lg:justify-start items-center gap-3 mt-4">
              <span className="text-on-surface-variant font-mono text-[10px] uppercase tracking-[0.3em]">SRM IST</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]"></span>
              <span className="font-geist text-sm font-medium text-on-surface-variant">B.Tech Student (Class of 2028)</span>
            </div>
          </div>

          {/* Grid layout bringing form and ID card to the same level */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-start">
            <div className="w-full">
              <ContactForm />
            </div>

            {/* Lanyard Canvas Container & Interactive Social Dock */}
            <div className="w-full relative flex flex-col items-center justify-center">
              <div className="h-[600px] w-full border-t-4 border-black overflow-hidden relative flex items-center justify-center bg-transparent">
                {cardTextures.front && cardTextures.back ? (
                  <Lanyard
                    key={lanyardKey}
                    position={[0, 0, 13.5]}
                    gravity={[0, -40, 0]}
                    frontImage={cardTextures.front}
                    backImage={cardTextures.back}
                    lanyardWidth={1.2}
                    imageFit="cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-t-[#ff6b00] border-white/10 rounded-full animate-spin"></div>
                    <span className="font-mono text-xs uppercase tracking-widest opacity-60">Initializing 3D Simulation...</span>
                  </div>
                )}

                {/* Drag hint overlay inside canvas */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] opacity-40 pointer-events-none">
                  🖱️ Drag badge to interact
                </div>
              </div>

              {/* Sleek Floating Social Link Dock (Responsive: Horizontal on Mobile, Absolute Vertical on Right on Desktop) */}
              <div className="w-full md:w-auto mt-8 md:mt-0 flex flex-row md:flex-col justify-around md:justify-center gap-6 p-4 md:py-8 rounded-2xl machined-edge glass-panel shadow-xl border border-white/5 bg-surface/50 backdrop-blur-2xl items-center md:absolute md:-right-16 lg:-right-28 xl:-right-36 md:top-1/2 md:-translate-y-1/2 z-10">
                <a className="flex flex-col items-center gap-1 group text-on-surface-variant hover:text-primary transition-all duration-300" href="https://github.com/CodeKeeda9" target="_blank" rel="noopener noreferrer">
                  <span className="material-symbols-outlined text-[24px] machined-edge p-2.5 rounded-xl bg-surface group-hover:border-[#ff6b00]/30 transition-colors">code</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">GitHub</span>
                </a>
                <a className="flex flex-col items-center gap-1 group text-on-surface-variant hover:text-primary transition-all duration-300" href="https://www.linkedin.com/in/manav-chopra-97514b290/" target="_blank" rel="noopener noreferrer">
                  <span className="material-symbols-outlined text-[24px] machined-edge p-2.5 rounded-xl bg-surface group-hover:border-[#ff6b00]/30 transition-colors">share</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">LinkedIn</span>
                </a>
                <a className="flex flex-col items-center gap-1 group text-on-surface-variant hover:text-primary transition-all duration-300" href="mailto:cmanav2006@gmail.com">
                  <span className="material-symbols-outlined text-[24px] machined-edge p-2.5 rounded-xl bg-surface group-hover:border-[#ff6b00]/30 transition-colors">alternate_email</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">Email</span>
                </a>
                <a className="flex flex-col items-center gap-1 group text-on-surface-variant hover:text-primary transition-all duration-300" href="tel:+918826711318">
                  <span className="material-symbols-outlined text-[24px] machined-edge p-2.5 rounded-xl bg-surface group-hover:border-[#ff6b00]/30 transition-colors">phone</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">Phone</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-16 bg-[#131313] machined-edge">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="font-geist font-bold text-3xl tracking-tighter text-on-surface">MANAV CHOPRA</div>
            <p className="font-body-md text-sm text-on-surface-variant">© 2026 Manav Chopra. Built with precision and React.</p>
          </div>
          <div className="flex gap-10">
            <a className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-[#ff6b00] transition-all" href="https://github.com/manavc-dev" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-[#ff6b00] transition-all" href="https://linkedin.com/in/manav-chopra" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-[#ff6b00] transition-all" href="mailto:cmanav2006@gmail.com">Email</a>
          </div>
          <div className="text-right hidden md:block">
            <p className="font-mono text-[10px] text-on-surface-variant/40 uppercase tracking-widest">BANGALORE, IN</p>
            <p className="font-mono text-sm text-primary-fixed mt-1" id="current-time">{currentTime}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
