import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Search, MessageCircle, ChevronRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const faqs = [
  {
    category: "Booking & Services",
    questions: [
      {
        q: "How do I make a booking?",
        a: "Booking a service is easy! Simply log in to your account, click on 'Book Service', choose your vehicle type, select the desired service package, pick a convenient date and time, and confirm your booking."
      },
      {
        q: "What are your workshop timings?",
        a: "Our workshops are open from 8:00 AM to 8:00 PM, Monday through Saturday. On Sundays, we operate from 9:00 AM to 5:00 PM for limited services."
      },
      {
        q: "Do you offer pick-up and drop-off?",
        a: "Yes, we offer complimentary pick-up and drop-off services for all major service packages within a 10km radius of our service centers."
      },
      {
        q: "How long does a general service take?",
        a: "A standard periodic maintenance service usually takes 4-6 hours. However, this may vary depending on the vehicle condition and any additional repairs required."
      }
    ]
  },
  {
    category: "Payments & Pricing",
    questions: [
      {
        q: "Do you accept credit cards?",
        a: "Yes, we accept all major credit cards, debit cards, UPI, and net banking. You can pay online through our secure portal or at the time of delivery."
      },
      {
        q: "Is there any hidden cost?",
        a: "No, we believe in complete transparency. All costs are estimated upfront. If any additional parts or repairs are needed during the service, we will seek your approval before proceeding."
      },
      {
        q: "Do you provide GST bills?",
        a: "Absolutely. All our invoices are GST compliant and detailed with part numbers and labor charges."
      }
    ]
  },
  {
    category: "Warranty & Parts",
    questions: [
      {
        q: "Do you use genuine parts?",
        a: "Yes, we use 100% genuine OES (Original Equipment Spares) or OEM (Original Equipment Manufacturer) parts recommended for your specific vehicle make and model."
      },
      {
        q: "Is there a warranty on the service?",
        a: "We offer a 1000km or 1-month warranty (whichever comes first) on all our service workmanship and parts replaced."
      }
    ]
  }
];

const FAQs = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000"
            alt="FAQs Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-primary/20 border border-primary/30 text-primary-foreground text-sm font-medium mb-4 backdrop-blur-md">
              Help Center
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
              Frequently Asked Questions
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed text-gray-200">
              Have questions? We're here to help. Find answers to common questions about our services, booking process, and more.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Contact Card */}
          <div className="lg:col-span-4 order-2 lg:order-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="sticky top-24 space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Still have questions?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Can't find the answer you're looking for? Please chat to our friendly team.
                </p>
                <Button className="w-full gap-2 group">
                  Contact Support 
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-2">Support Hours</h3>
                <p className="text-sm text-muted-foreground">
                  Mon - Fri: 8am - 8pm<br/>
                  Sat - Sun: 9am - 5pm
                </p>
              </div>
            </motion.div>
          </div>

          {/* FAQs List */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-card/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-sm border border-border/50"
            >
              {faqs.map((category, idx) => (
                <div key={idx} className="mb-10 last:mb-0">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {idx + 1}
                    </span>
                    {category.category}
                  </h2>
                  <Accordion type="single" collapsible className="w-full space-y-4">
                    {category.questions.map((faq, i) => (
                      <AccordionItem 
                        key={i} 
                        value={`item-${idx}-${i}`}
                        className="border border-border/50 rounded-xl px-4 bg-card hover:bg-accent/5 transition-colors"
                      >
                        <AccordionTrigger className="text-left font-medium text-lg py-4 hover:no-underline hover:text-primary transition-colors">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FAQs;
