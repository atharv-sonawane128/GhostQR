'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Ghost, Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name, email, password, phone);
      toast.success('Account created! Welcome to GhostQR 👻');
      if (data?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(err.message.includes('email-already') ? 'Email already in use' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ghost-900 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(168,85,247,0.08) 0%, transparent 50%), #ffffff'
      }}>

      <div className="fixed top-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            <Ghost className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ghost-100 mb-1">Create Account</h1>
          <p className="text-ghost-300 text-sm">Join GhostQR and protect your belongings</p>
        </div>

        {/* Card */}
        <div className="glass p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ghost-300 mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-400" />
                <input
                  type="text"
                  required
                  value={name}
                  style={{ paddingLeft: '40px' }}
                  onChange={e => setName(e.target.value)}
                  className="ghost-input pl-10"
                  placeholder="Atharva Sonawane"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ghost-300 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-400" />
                <input
                  type="email"
                  required
                  value={email}
                  style={{ paddingLeft: '40px' }}
                  onChange={e => setEmail(e.target.value)}
                  className="ghost-input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ghost-300 mb-1.5 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  style={{ paddingLeft: '40px' }}
                  onChange={e => setPhone(e.target.value)}
                  className="ghost-input pl-10"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ghost-300 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  style={{ paddingLeft: '40px' }}
                  onChange={e => setPassword(e.target.value)}
                  className="ghost-input pl-10 pr-10"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ghost-400 hover:text-ghost-200"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-ghost w-full py-3 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          {/* Terms note */}
          <p className="text-[11px] text-ghost-400 text-center mt-4 leading-relaxed">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center text-sm text-ghost-300 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-ghost-accent-light hover:text-ghost-200 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
