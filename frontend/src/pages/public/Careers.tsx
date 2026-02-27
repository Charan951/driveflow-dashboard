import React from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, ArrowRight, Zap, Heart, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

const Careers = () => {
  const positions = [
    {
      id: 1,
      title: "Senior Automotive Technician",
      department: "Service Operations",
      location: "Auto City, AC",
      type: "Full-time",
      salary: "₹8L - ₹12L"
    },
    {
      id: 2,
      title: "Service Advisor",
      department: "Customer Success",
      location: "Remote / Hybrid",
      type: "Full-time",
      salary: "₹5L - ₹8L"
    },
    {
      id: 3,
      title: "Backend Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      salary: "₹12L - ₹25L"
    },
    {
      id: 4,
      title: "Fleet Manager",
      department: "Logistics",
      location: "Auto City, AC",
      type: "Full-time",
      salary: "₹7L - ₹10L"
    }
  ];

  const handleApply = (role: string) => {
    toast.success(`Application process started for ${role}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=2000" 
            alt="Team meeting" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Build the Future of Vehicle Care
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Join a team of passionate individuals revolutionizing how people maintain their cars. 
              We're looking for dreamers, doers, and problem solvers.
            </p>
            <div className="mt-8">
              <button 
                onClick={() => document.getElementById('positions')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-all inline-flex items-center gap-2"
              >
                View Open Roles <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content (Benefits) */}
      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-border/50 mb-12"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Join DriveFlow?</h2>
            <p className="text-muted-foreground">More than just a job, it's a career with purpose.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: "Fast-Paced Growth",
                desc: "Accelerate your career in a high-growth startup environment."
              },
              {
                icon: Heart,
                title: "Health & Wellness",
                desc: "Comprehensive medical, dental, and vision coverage for you and your family."
              },
              {
                icon: Users,
                title: "Great Culture",
                desc: "Collaborative, inclusive, and fun work environment with regular team events."
              },
              {
                icon: DollarSign,
                title: "Competitive Pay",
                desc: "Market-leading salaries and equity packages for all employees."
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Open Positions */}
      <section id="positions" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Open Positions</h2>
              <p className="text-muted-foreground">Find your next role at DriveFlow.</p>
            </div>
          </div>

          <div className="space-y-4">
            {positions.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-background p-6 rounded-xl border border-border hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {job.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {job.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> {job.salary}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleApply(job.title)}
                  className="px-6 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Apply Now
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Don't see the right fit?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            We're always looking for talented people. Send us your resume and we'll keep you in mind for future openings.
          </p>
          <button 
            onClick={() => toast.success("Resume upload feature coming soon!")}
            className="px-8 py-3 bg-white text-primary rounded-full font-bold hover:bg-gray-100 transition-colors"
          >
            Send General Application
          </button>
        </div>
      </section>
    </div>
  );
};

export default Careers;
