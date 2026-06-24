export default function Experience() {
    const experiences = [
        {
            year: "2024-Present",
            company: "SRM Institute of Science & Technology",
            position: "B.Tech CSE (AI & ML) Student",
            skills: ["Machine Learning", "AI Systems", "Data Structures", "Web Development"],
            description: "Pursuing computer science with specialization in Artificial Intelligence and Machine Learning. Maintaining strong academic performance while developing full-stack applications.",
            link: "https://www.srmist.edu.in"
        },
        {
            year: "2025-Present",
            company: "Computer Society of India (CSI) Student Chapter",
            position: "Creative Lead",
            skills: ["Design System", "Brand Management", "Creative Direction", "Asset Design"],
            description: "Designed promotional content and assets for 3+ major hackathons with over 1,000 participants while managing a unified brand system.",
            link: "#"
        },
        {
            year: "2026",
            company: "Inno AI Labs",
            position: "AI/ML Intern",
            skills: ["Python", "Numpy", "Pandas", "SQL", "Machine Learning"],
            description: "Developing AI powered applications for Startups and Brands",
            link: "#"
        }
    ];

    return (
        <section className="py-40 px-6 lg:px-40 relative" id="experience">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-24">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px w-10 bg-[#ff6b00]/20"></div>
                        <span className="font-mono text-xs text-[#ff6b00] tracking-[0.3em] uppercase">03 / Experience</span>
                        <div className="h-px w-10 bg-[#ff6b00]/20"></div>
                    </div>
                    <h2 className="font-geist text-5xl md:text-7xl leading-none tracking-tight">
                        Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] via-white to-[#ed9000]">Journey.</span>
                    </h2>
                    <p className="font-body-lg text-lg text-on-surface-variant mt-6 leading-relaxed">
                        Building solutions, learning continuously, and creating impact through technology.
                    </p>
                    <div className="w-12 h-1 bg-[#ff6b00]/30 mx-auto rounded-full mt-6"></div>
                </div>

                {/* Timeline Container */}
                <div className="relative max-w-4xl mx-auto">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 md:w-px bg-gradient-to-b from-[#ff6b00]/0 via-[#ff6b00]/40 to-[#ff6b00]/0 md:-translate-x-1/2"></div>

                    {/* Experience Items */}
                    <div className="space-y-12 md:space-y-20">
                        {experiences.map((exp, idx) => (
                            <div key={idx} className={`relative flex gap-8 md:gap-0 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                {/* Timeline Dot */}
                                <div className="absolute left-0 md:left-1/2 top-8 w-5 h-5 rounded-full bg-[#ff6b00]/80 border-4 border-[#0c0e10] shadow-[0_0_20px_rgba(255,107,0,0.4)] md:-translate-x-1/2 z-10"></div>

                                {/* Content */}
                                <div className={`w-full md:w-1/2 ${idx % 2 === 0 ? 'md:pr-16' : 'md:pl-16'} ml-12 md:ml-0`}>
                                    <div className="glass-panel machined-edge p-8 rounded-2xl hover:border-[#ff6b00]/20 transition-all duration-300 group">
                                        {/* Year Badge */}
                                        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20">
                                            <span className="w-2 h-2 rounded-full bg-[#ff6b00]"></span>
                                            <span className="font-mono text-xs text-[#ff6b00] font-bold tracking-wider">{exp.year}</span>
                                        </div>

                                        {/* Company & Position */}
                                        <h3 className="font-geist text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-[#ff6b00] transition-colors">
                                            {exp.company}
                                        </h3>
                                        <p className="font-geist text-lg font-semibold text-[#ff6b00] mb-4">
                                            {exp.position}
                                        </p>

                                        {/* Description */}
                                        <p className="font-body-md text-sm md:text-base text-on-surface-variant mb-6 leading-relaxed">
                                            {exp.description}
                                        </p>

                                        {/* Skills Tags */}
                                        <div className="flex flex-wrap gap-3 mb-6">
                                            {exp.skills.map((skill, skillIdx) => (
                                                <span
                                                    key={skillIdx}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-[#e2e2e5] hover:border-[#ff6b00]/40 hover:bg-[#ff6b00]/5 transition-all"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Visit Link */}
                                        <a
                                            href={exp.link}
                                            target={exp.link !== '#' ? '_blank' : undefined}
                                            rel={exp.link !== '#' ? 'noopener noreferrer' : undefined}
                                            className="inline-flex items-center gap-2 text-[#ff6b00] hover:text-white font-mono text-xs font-bold tracking-wider uppercase transition-colors group/link"
                                        >
                                            <span>Learn More</span>
                                            <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">
                                                arrow_forward
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-24 text-center">
                    <p className="font-body-lg text-on-surface-variant mb-8">
                        Want to know more about my journey?
                    </p>
                    <a
                        href="/resume.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 primary-machined-button px-10 py-5 rounded-2xl font-geist font-bold text-on-primary-fixed"
                    >
                        <span className="text-sm tracking-widest">DOWNLOAD RESUME</span>
                        <span className="material-symbols-outlined">file_download</span>
                    </a>
                </div>
            </div>
        </section>
    );
}
