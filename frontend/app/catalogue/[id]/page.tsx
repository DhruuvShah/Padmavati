"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CatalogueSharePage() {
  const params = useParams();
  const id = params.id as string;
  const [state, setState] = useState<'loading' | 'initial' | 'otp' | 'pending' | 'approved' | 'denied'>('loading');
  const [catalogue, setCatalogue] = useState<any>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    checkStatus();
  }, [id]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`/api/catalogue/status?uuid=${id}`);
      const data = await res.json();

      if (res.ok) {
        setState(data.state);
        setCatalogue(data.catalogue);
      } else {
        setErrorMsg("Catalogue not found");
        setState('denied');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error checking status");
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !email) {
      setErrorMsg("All fields are required");
      return;
    }

    setErrorMsg("");
    setState('loading');

    try {
      const res = await fetch(`/api/catalogue/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: id, name, mobile, email })
      });

      if (res.ok) {
        setState('otp');
        setResendCooldown(60);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to request access");
        setState('initial');
      }
    } catch (err) {
      setErrorMsg("Network error");
      setState('initial');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch(`/api/catalogue/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: id })
      });
      if (res.ok) {
        setResendCooldown(60);
        setErrorMsg("");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to resend");
      }
    } catch (err) {
      setErrorMsg("Network error");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg("Please enter a 6-digit code");
      return;
    }

    setErrorMsg("");
    setState('loading');

    try {
      const res = await fetch(`/api/catalogue/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: id, otp })
      });

      if (res.ok) {
        setState('pending');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Invalid OTP");
        setState('otp');
      }
    } catch (err) {
      setErrorMsg("Network error");
      setState('otp');
    }
  };

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-1 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-destructive rounded-xl flex items-center justify-center font-bold text-white text-2xl">PC</div>
            <span className="font-display text-4xl font-bold text-destructive">Padmavati</span>
          </div>
          <span className="text-[12px] tracking-[0.2em] font-semibold text-muted-foreground ml-14 -mt-1 uppercase">Corporation</span>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
          {catalogue && (
            <div className="text-center mb-8 pb-6 border-b border-border">
              <h1 className="font-heading font-bold text-xl mb-2">{catalogue.title}</h1>
              <p className="text-xs font-semibold text-warning uppercase bg-warning/10 inline-flex px-2 py-1 rounded-md">Private Catalogue</p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md mb-6 text-center">
              {errorMsg}
            </div>
          )}

          {state === 'initial' && (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold">Request Access</h2>
                <p className="text-sm text-muted-foreground">Please provide your details to request access to this private catalogue.</p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-foreground">Mobile Number</label>
                <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91..." required />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
              </div>

              <Button type="submit" className="w-full mt-6">Send Access Code</Button>
            </form>
          )}

          {state === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold">Verify Email</h2>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your email.</p>
              </div>

              <div className="space-y-1.5 text-left w-2/3 mx-auto">
                <label className="text-sm font-medium text-foreground text-center block">6-Digit Code</label>
                <Input
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                  placeholder="123456"
                  className="text-center font-mono text-2xl tracking-widest h-12"
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-6">Verify Code</Button>
              <div className="text-center mt-4 space-y-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  Resend code {resendCooldown > 0 ? `(${resendCooldown}s)` : ''}
                </button>
              </div>
            </form>
          )}

          {state === 'pending' && (
            <div className="text-center space-y-4 py-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-warning/20 text-warning rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h2 className="text-xl font-bold">Request Submitted</h2>
              <p className="text-muted-foreground text-sm">Your request has been submitted. The owner will review and approve shortly.</p>
              <p className="text-muted-foreground text-sm">We'll email you when it's approved.</p>
            </div>
          )}

          {state === 'denied' && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
              <p className="text-muted-foreground text-sm">Your access to this catalogue was not approved.</p>
            </div>
          )}

          {state === 'approved' && catalogue && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-xl font-bold">Request Approved!</h2>
              <p className="text-muted-foreground text-sm">You can now view the catalogue.</p>
              <a
                href={catalogue.pdf_url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ className: "w-full" })}
              >
                View PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
