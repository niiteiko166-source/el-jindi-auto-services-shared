import React, { useState } from 'react';
import { db } from '../services/db';

const logoSrc = '/assets/images/logo.png';

interface LoginProps {
  onLogin: (role: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setError(null);

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    // Try server-side auth first
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
    }).then(async (r) => {
      if (!r.ok) throw new Error('Server auth failed');
      const j = await r.json();
      if (j && j.user) {
        db.setCurrentUser(j.user);
        onLogin(j.user.role);
        return;
      }
      throw new Error('Invalid server response');
    }).catch(async () => {
      setError('Invalid credentials — email or password is incorrect.');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'linear-gradient(180deg, #0b0b0d 0%, #1a1a1c 40%, #0b0b0d 100%)'}}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 40px rgba(255,43,43,0.18); }
          50% { box-shadow: 0 0 80px rgba(255,43,43,0.28); }
          100% { box-shadow: 0 0 40px rgba(255,43,43,0.18); }
        }
        .left-glow { animation: pulse 2.6s ease-in-out infinite; }
      `}</style>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-20 w-160 h-105 rounded-[120px] opacity-60 blur-3xl transform rotate-6" style={{background: 'radial-gradient(circle at 30% 30%, rgba(255,80,80,0.9), rgba(180,10,10,0.6) 40%, transparent 60%)'}} />
        <div className="absolute -right-30 -bottom-20 w-120 h-90 rounded-[160px] opacity-50 blur-2xl" style={{background: 'radial-gradient(circle at 70% 70%, rgba(90,160,255,0.75), rgba(20,60,120,0.4) 40%, transparent 65%)'}} />
      </div>

      <div className="relative w-full max-w-4xl p-6">
        <div className="mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden" style={{maxWidth: 920, borderColor: 'rgba(255,50,50,0.12)'}}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-14 text-white left-glow" style={{background: 'linear-gradient(180deg, rgba(200,20,20,0.12), rgba(0,0,0,0.0))'}}>
              <img src={logoSrc} alt="Logo" className="w-32 h-32 object-contain mb-6 block" />
              <h2 className="text-3xl font-extrabold mb-2" style={{color: '#ff2b2b'}}>EL-JINDI Auto Services</h2>
              <div className="text-lg font-medium" style={{color: '#ffdcdc'}}>Login</div>
              <p className="mt-4 text-sm opacity-90 max-w-xs text-center" style={{color: 'rgba(255,255,255,0.9)'}}>Welcome back — sign in to manage jobs, invoices and inventory.</p>
            </div>

            <div className="p-8 md:p-10 bg-white/60" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(250,250,250,0.9))'}}>
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-slate-800 mb-1" style={{color: '#111827'}}>Login</h3>
                <p className="text-sm text-slate-600 mb-6" style={{color: '#374151'}}>Sign in to your account</p>

                <div className="space-y-5">
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="username@gmail.com" className="w-full px-4 py-4 rounded-lg border bg-white text-slate-800" style={{borderColor: '#e6e6e6'}} />
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full px-4 py-4 rounded-lg border bg-white text-slate-800" style={{borderColor: '#e6e6e6'}} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* role selector removed: login by email + password only */}
                      <div />
                    </div>
                  </div>

                  <button onClick={handleLogin} className="w-full py-4 rounded-lg font-semibold transform transition duration-200 hover:-translate-y-1 hover:shadow-lg" style={{background: 'linear-gradient(90deg,#ff2b2b,#ff6b6b)', color: '#fff', boxShadow: '0 6px 18px rgba(255,40,40,0.18)'}}>Sign in</button>
                </div>

                <div className="mt-4 text-center text-sm text-slate-600">or continue with</div>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button className="w-10 h-10 rounded bg-white flex items-center justify-center" style={{color: '#ff2b2b'}}>in</button>
                </div>

                {error && <div className="mt-4 text-center text-sm text-red-600">{error}</div>}

                <div className="mt-6 text-center text-xs text-slate-500">Don't have an account? <a className="text-slate-800 underline" href="#">Register for free</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
