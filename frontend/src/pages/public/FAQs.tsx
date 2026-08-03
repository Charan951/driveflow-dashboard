import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Search, MessageCircle, ChevronRight, Loader2 } from 'lucide-react';
import { heroService } from "@/services/heroService";
import { faqService, PublicFaqCategory } from "@/services/faqService";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const FAQs = () => {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<PublicFaqCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hero, setHero] = useState({
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000",
    title: "Frequently Asked Questions",
    subtitle: "Have questions? We're here to help. Find answers to common questions about our services, booking process, and more."
  });

  useEffect(() => {
    fetchHero();
    fetchFaqs();
  }, []);

  const fetchHero = async () => {
    try {
      const data = await heroService.getHeroSettings();
      const pageHero = data.pageHeroes?.['faqs'];
      if (pageHero) {
        setHero({
          image: pageHero.image || hero.image,
          title: pageHero.title || hero.title,
          subtitle: pageHero.subtitle || hero.subtitle
        });
      }
    } catch (error) {
      console.error('Failed to fetch faqs hero from S3', error);
    }
  };

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const data = await faqService.getPublicFaqs();
      setFaqs(data);
    } catch (error) {
      console.error('Failed to fetch FAQs from API', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.map(cat => {
    const matchesCat = cat.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingQuestions = cat.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchesCat) return cat;
    return {
      ...cat,
      questions: matchingQuestions
    };
  }).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={hero.image}
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
              {hero.title}
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed text-gray-200">
              {hero.subtitle}
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
              {/* Search Box */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Search FAQs
                </h3>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Still have questions?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Can't find the answer you're looking for? Please chat to our friendly team.
                </p>
                <Button className="w-full gap-2 group" onClick={() => navigate('/contact')}>
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
              {loading ? (
                <div className="space-y-8 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-8 w-1/3 rounded-lg" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredFaqs.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium">No FAQs Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? `No answers match "${searchQuery}".` : 'No FAQs are available at this time.'}
                  </p>
                </div>
              ) : (
                filteredFaqs.map((category, idx) => (
                  <div key={category._id || idx} className="mb-10 last:mb-0">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        {idx + 1}
                      </span>
                      {category.category}
                    </h2>
                    <Accordion type="single" collapsible className="w-full space-y-4">
                      {category.questions.map((faq, i) => (
                        <AccordionItem 
                          key={faq._id || i} 
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
                ))
              )}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FAQs;
