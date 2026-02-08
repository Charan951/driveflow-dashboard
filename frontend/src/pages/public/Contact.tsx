import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Background Image */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=2000"
            alt="Contact Support" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.h1 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400"
          >
            Get in Touch
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed"
          >
            We'd love to hear from you. Our friendly team is always here to chat.
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="lg:col-span-1 space-y-6"
          >
            {[
              {
                icon: MapPin,
                title: "Visit Us",
                details: ["123 DriveFlow Lane", "Auto City, AC 90210"],
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                border: "border-blue-200 dark:border-blue-900"
              },
              {
                icon: Phone,
                title: "Call Us",
                details: ["+1 (555) 123-4567", "+1 (555) 987-6543"],
                color: "text-green-500",
                bg: "bg-green-500/10",
                border: "border-green-200 dark:border-green-900"
              },
              {
                icon: Mail,
                title: "Email Us",
                details: ["support@driveflow.com", "info@driveflow.com"],
                color: "text-purple-500",
                bg: "bg-purple-500/10",
                border: "border-purple-200 dark:border-purple-900"
              },
              {
                icon: Clock,
                title: "Working Hours",
                details: ["Mon - Fri: 8:00 AM - 8:00 PM", "Sat - Sun: 9:00 AM - 5:00 PM"],
                color: "text-orange-500",
                bg: "bg-orange-500/10",
                border: "border-orange-200 dark:border-orange-900"
              }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                whileHover={{ scale: 1.02, x: 5 }}
                className={`bg-card p-6 rounded-xl shadow-lg border ${item.border} flex items-start gap-4 transition-all duration-300 hover:shadow-xl`}
              >
                <div className={`p-4 rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  {item.details.map((line, i) => (
                    <p key={i} className="text-muted-foreground text-sm font-medium">{line}</p>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 md:p-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Send us a Message</h2>
                  <p className="text-muted-foreground">We typically reply within 2 hours</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                    placeholder="How can we help you?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Message</label>
                  <textarea
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  ></textarea>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-10 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
