import { useState } from 'react';

// ============================================================================
// CONFIGURATION
// ============================================================================
// FormSubmit will automatically deliver submissions to this email.
// The very first submission will send a one-time activation link to this email.
const RECIPIENT_EMAIL = 'cmanav2006@gmail.com';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    ticketType: 'General Inquiry',
    message: ''
  });

  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const ticketTypes = [
    { label: 'General Inquiry', icon: 'info' },
    { label: 'Collaboration', icon: 'handshake' },
    { label: 'Bug Report', icon: 'bug_report' },
    { label: 'Feedback', icon: 'rate_review' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectTicketType = (type) => {
    setFormData(prev => ({ ...prev, ticketType: type }));
  };

  const handleMailtoFallback = () => {
    const subject = encodeURIComponent(`[${formData.ticketType}] Message from ${formData.name}`);
    const body = encodeURIComponent(
      `Hello Manav,\n\nYou received a new contact submission:\n\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Category: ${formData.ticketType}\n\n` +
      `Message:\n${formData.message}\n`
    );
    window.open(`mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`, '_self');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple Client-side validation
    if (!formData.name || !formData.email || !formData.message) {
      setStatus('error');
      setErrorMessage('Please fill in all fields before submitting.');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          _subject: `[Portfolio Ticket] ${formData.ticketType} - ${formData.name}`,
          message: formData.message,
          category: formData.ticketType,
          _captcha: 'false' // Disables the FormSubmit spam captcha check for a seamless UX
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const data = await response.json();
      if (data.success === 'true' || data.success === true) {
        setStatus('success');
        setFormData({ name: '', email: '', ticketType: 'General Inquiry', message: '' });
      } else {
        throw new Error(data.message || 'FormSubmit transmission failed.');
      }
    } catch (err) {
      console.error('Email delivery error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Connection error. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-panel machined-edge rounded-3xl p-8 shadow-2xl relative overflow-hidden bg-[#131313]/40 backdrop-blur-2xl">
      {/* Background glowing gradient orb */}
      <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-[#ff6b00]/10 rounded-full blur-[80px] pointer-events-none"></div>

      {status === 'idle' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-geist text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff6b00] text-[22px]">confirmation_number</span>
              Raise a Ticket / Send Message
            </h3>
            <p className="font-mono text-[10px] text-[#e2bfb0]/70 uppercase tracking-widest">
              Direct connection line
            </p>
          </div>

          {/* Ticket Type / Subject Chips */}
          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[#ff6b00] font-bold">
              Select Topic
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ticketTypes.map((type) => {
                const isActive = formData.ticketType === type.label;
                return (
                  <button
                    key={type.label}
                    type="button"
                    onClick={() => selectTicketType(type.label)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-mono transition-all duration-300 ${isActive
                      ? 'bg-[#ff6b00]/10 border-[#ff6b00] text-white shadow-[0_0_15px_rgba(255,107,0,0.15)] font-bold'
                      : 'bg-[#1c1b1b]/30 border-white/5 text-[#e2bfb0] hover:border-white/20 hover:bg-[#1c1b1b]/50'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#ff6b00]' : 'text-[#e2bfb0]/60'}`}>
                      {type.icon}
                    </span>
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="form-name" className="block font-mono text-[10px] uppercase tracking-widest text-[#e2bfb0]/80">
                Your Name
              </label>
              <input
                id="form-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter name"
                className="w-full bg-[#131313]/60 border border-white/5 focus:border-[#ff6b00] focus:ring-0 rounded-xl px-4 py-3 text-white placeholder-white/20 transition-all font-mono text-sm outline-none machined-edge"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="form-email" className="block font-mono text-[10px] uppercase tracking-widest text-[#e2bfb0]/80">
                Email Address
              </label>
              <input
                id="form-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="name@example.com"
                className="w-full bg-[#131313]/60 border border-white/5 focus:border-[#ff6b00] focus:ring-0 rounded-xl px-4 py-3 text-white placeholder-white/20 transition-all font-mono text-sm outline-none machined-edge"
              />
            </div>
          </div>

          {/* Message Area */}
          <div className="space-y-2">
            <label htmlFor="form-message" className="block font-mono text-[10px] uppercase tracking-widest text-[#e2bfb0]/80">
              Your Message
            </label>
            <textarea
              id="form-message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              rows="4"
              placeholder="How can Manav help you today?"
              className="w-full bg-[#131313]/60 border border-white/5 focus:border-[#ff6b00] focus:ring-0 rounded-xl px-4 py-3 text-white placeholder-white/20 transition-all font-mono text-sm outline-none resize-none machined-edge"
            ></textarea>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full primary-machined-button py-4 rounded-xl font-geist font-bold text-sm tracking-widest uppercase text-[#351000] flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            SUBMIT
          </button>
        </form>
      )}

      {status === 'submitting' && (
        <div className="py-20 flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 border-4 border-t-[#ff6b00] border-white/10 rounded-full animate-spin"></div>
          <div className="text-center space-y-2">
            <h4 className="font-geist text-lg font-bold text-white tracking-widest uppercase">Transmitting Signal</h4>
            <p className="font-mono text-xs text-[#e2bfb0]/80 animate-pulse">
              Routing message package through secure channel...
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500 rounded-full flex items-center justify-center text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <span className="material-symbols-outlined text-[44px]">task_alt</span>
          </div>
          <div className="space-y-3">
            <h4 className="font-geist text-2xl font-bold text-white uppercase tracking-tight">Transmission Complete</h4>
            <p className="font-mono text-xs text-[#e2bfb0] max-w-sm mx-auto leading-relaxed">
              Your message has been processed successfully. Manav has been alerted.
            </p>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="machined-button px-8 py-3 rounded-xl font-geist font-bold text-xs tracking-wider uppercase text-white hover:border-[#ff6b00]/30 transition-colors"
          >
            Send Another Message
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <span className="material-symbols-outlined text-[44px]">error</span>
          </div>
          <div className="space-y-3 px-4">
            <h4 className="font-geist text-2xl font-bold text-white uppercase tracking-tight">Transmission Fault</h4>
            <p className="font-mono text-xs text-red-400 max-w-sm mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full px-8">
            <button
              onClick={handleMailtoFallback}
              className="flex-1 primary-machined-button py-3 rounded-xl font-geist font-bold text-xs tracking-wider uppercase text-[#351000] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">mail</span>
              Send via Email App
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="flex-1 machined-button py-3 rounded-xl font-geist font-bold text-xs tracking-wider uppercase text-white"
            >
              Try Form Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
