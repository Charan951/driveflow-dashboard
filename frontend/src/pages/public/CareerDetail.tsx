import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, Upload, ArrowLeft, RefreshCw } from 'lucide-react';
import { careerService, Career } from '@/services/careerService';
import { uploadService } from '@/services/uploadService';
import { captchaService, CaptchaData } from '@/services/captchaService';
import { toast } from 'sonner';
import { isValidEmail, isValidPhone10, isValidName, hasExcessiveRepeatedChars } from "@/lib/formValidation";

const CAREER_MAX_NAME_LENGTH = 10;
const CAREER_MAX_EMAIL_LENGTH = 20;

const CareerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [career, setCareer] = useState<Career | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    resumeUrl: '',
    additionalMessage: '',
  });


  useEffect(() => {
    const fetchCareer = async () => {
      try {
        if (!id) return;
        const data = await careerService.getCareerById(id);
        setCareer(data);
      } catch (error) {
        setCareer(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCareer();
    loadCaptcha();
  }, [id]);

  const loadCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const data = await captchaService.getCaptcha();
      setCaptchaData(data);
      setCaptchaInput("");
    } catch (err) {
      toast.error("Failed to load CAPTCHA");
    } finally {
      setCaptchaLoading(false);
    }
  };


  const onUploadResume = async (file?: File, event?: React.ChangeEvent<HTMLInputElement>) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file only');
      if (event?.target) {
        event.target.value = '';
      }
      return;
    }
    
    // Validate file size (15MB max)
    const maxSizeMB = 15;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size should not exceed ${maxSizeMB}MB`);
      if (event?.target) {
        event.target.value = '';
      }
      return;
    }
    
    try {
      setUploadingResume(true);
      const uploaded = await uploadService.uploadPublicFile(file);
      setForm((prev) => ({ ...prev, resumeUrl: uploaded.url || '' }));
      toast.success('Resume uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Resume upload failed');
    } finally {
      setUploadingResume(false);
      if (event?.target) {
        event.target.value = '';
      }
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    
    const formElement = e.currentTarget;
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }
    
    if (!form.resumeUrl) {
      toast.error('Please upload your resume');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (form.name.trim().length > CAREER_MAX_NAME_LENGTH) {
      toast.error(`Name cannot exceed ${CAREER_MAX_NAME_LENGTH} characters`);
      return;
    }
    if (!isValidName(form.name)) {
      toast.error('Please enter valid data');
      return;
    }
    if (hasExcessiveRepeatedChars(form.name)) {
      toast.error('Too many repeated characters');
      return;
    }
    
    const emailValidation = isValidEmail(form.email);
    if (!emailValidation.valid) {
      toast.error(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    if (!isValidPhone10(form.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (form.additionalMessage.trim().length > 1000) {
      toast.error('Additional message is too long');
      return;
    }
    if (!captchaInput || !captchaData) {
      toast.error('Please enter the CAPTCHA code');
      return;
    }

    try {
      setSubmitting(true);
      await careerService.applyForCareer(id, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.replace(/\D/g, ''),
        additionalMessage: form.additionalMessage.trim(),
        captchaInput,
        captchaSignature: captchaData.signature,
        captchaExpiry: captchaData.expiry,
      });
      toast.success('Application submitted successfully');
      setForm({
        name: '',
        email: '',
        mobileNumber: '',
        resumeUrl: '',
        additionalMessage: '',
      });
      loadCaptcha();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit application');
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }

  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!career) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <h1 className="text-2xl font-bold mb-3">Job not found</h1>
          <Link to="/careers" className="text-primary hover:underline">Back to careers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-12">
        <Link to="/careers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to careers
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold">{career.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${career.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {career.isActive ? 'Active' : 'Closed'}
              </span>
            </div>
            {career.shortDescription ? (
              <p className="text-muted-foreground">{career.shortDescription}</p>
            ) : null}
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> {career.department}</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {career.location}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {career.type}</span>
              <span className="flex items-center gap-2"><span className="text-sm font-semibold">₹</span> {career.salary || 'As per company standards'}</span>
            </div>
          </motion.div>

          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4"
          >
            <h2 className="text-2xl font-bold">Apply for this role</h2>
            <input 
              required 
              maxLength={CAREER_MAX_NAME_LENGTH} 
              value={form.name} 
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  name: e.target.value.slice(0, CAREER_MAX_NAME_LENGTH),
                }));
              }} 
              placeholder="Name" 
              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none" 
            />
            <input 
              required 
              maxLength={CAREER_MAX_EMAIL_LENGTH} 
              type="email" 
              value={form.email} 
              onChange={(e) => {
                let newEmail = e.target.value;
                // Truncate if too long
                if (newEmail.length > CAREER_MAX_EMAIL_LENGTH) {
                  newEmail = newEmail.slice(0, CAREER_MAX_EMAIL_LENGTH);
                }
                setForm((prev) => ({ ...prev, email: newEmail }));
              }} 
              placeholder="Email address" 
              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none" 
            />
            <input 
              required 
              maxLength={10} 
              type="tel" 
              value={form.mobileNumber} 
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, '');
                setForm((prev) => ({ ...prev, mobileNumber: numericValue }));
              }} 
              placeholder="Mobile number" 
              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none" 
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Upload Resume (PDF, max 15MB)</label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 rounded-lg border border-border hover:bg-muted cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploadingResume ? 'Uploading...' : 'Choose File'}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => onUploadResume(e.target.files?.[0], e)} />
                </label>
                <span className="text-xs text-muted-foreground truncate">{form.resumeUrl ? 'Resume uploaded' : 'No file uploaded'}</span>
              </div>
            </div>

            <textarea value={form.additionalMessage} onChange={(e) => setForm((prev) => ({ ...prev, additionalMessage: e.target.value }))} placeholder="Additional message (optional)" className="w-full px-4 py-2 min-h-[100px] bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none" />

            {captchaData && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Security Verification</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      dangerouslySetInnerHTML={{ __html: captchaData.svg }} 
                      className="flex-shrink-0"
                    />
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      disabled={captchaLoading}
                      className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground disabled:opacity-50"
                      title="Refresh CAPTCHA"
                    >
                      <RefreshCw className={`w-5 h-5 ${captchaLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="w-full sm:w-40 px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    maxLength={6}
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting || uploadingResume || !career.isActive} className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 font-semibold">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>

          </motion.form>
        </div>
      </div>
    </div>
  );
};

export default CareerDetail;
