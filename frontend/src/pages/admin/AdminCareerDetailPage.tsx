import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, MapPin, Clock, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { careerService, Career, CareerApplication } from '@/services/careerService';
import { toast } from 'sonner';

const AdminCareerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'details' | 'applications'>('details');
  const [career, setCareer] = useState<Career | null>(null);
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const [careerData, applicationsData] = await Promise.all([
          careerService.getAdminCareerById(id),
          careerService.getCareerApplications(id),
        ]);
        setCareer(careerData);
        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
      } catch (error) {
        toast.error('Failed to load career details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!career) {
    return <div className="p-8">Career not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
      <Link to="/admin/hero-images" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to Content Manager
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{career.title}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${career.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {career.isActive ? 'Active' : 'Closed'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('details')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Job Details
        </button>
        <button onClick={() => setActiveTab('applications')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'applications' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Applications ({applications.length})
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> {career.department}</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {career.location}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {career.type}</div>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> {career.salary || 'Not specified'}</div>
          </div>
          {career.shortDescription ? (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{career.shortDescription}</p>
            </div>
          ) : null}
          {career.applyUrl ? (
            <div className="text-sm">
              <span className="font-semibold">Apply URL: </span>
              <a href={career.applyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {career.applyUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6">
          {applications.length === 0 ? (
            <div className="text-muted-foreground">No applications yet.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <div key={application._id} className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{application.name}</p>
                      <p className="text-sm text-muted-foreground">{application.email} • {application.mobileNumber}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted border border-border">{application.status}</span>
                  </div>
                  {application.additionalMessage ? (
                    <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{application.additionalMessage}</p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between">
                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      View Resume
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {application.createdAt ? new Date(application.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCareerDetailPage;
