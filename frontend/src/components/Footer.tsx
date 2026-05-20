import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, MapPin, Phone, Mail } from 'lucide-react';
import { heroService } from '@/services/heroService';

const Footer: React.FC = () => {
  const [contactDetails, setContactDetails] = useState({
    address: 'Plot no 71 & 72, 3rd Floor, Phase IV, IDA Cherlapally, Hyderabad- 500051',
    mobileNumber: '+91 9849964945',
    email: 'info@carzzi.com',
  });

  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        const data = await heroService.getHeroSettings();
        if (data.contactDetails) {
          setContactDetails({
            address: data.contactDetails.address || contactDetails.address,
            mobileNumber: data.contactDetails.mobileNumber || contactDetails.mobileNumber,
            email: data.contactDetails.email || contactDetails.email,
          });
        }
      } catch (error) {
        // keep default fallback values
      }
    };
    fetchContactDetails();
  }, []);

  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex flex-row items-center gap-3 mb-4">
              <img src="/footer.png" alt="Carzzi Logo" className="w-12 h-12" />
              <p className="text-sm text-muted-foreground">
                Premium vehicle services at your doorstep. Your car deserves the best care.
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-primary transition-colors">All Services</Link></li>
              <li><Link to="/car-wash" className="hover:text-primary transition-colors">Car Wash</Link></li>
              <li><Link to="/book-service?category=Essentials" className="hover:text-primary transition-colors">Essentials</Link></li>
              <li><Link to="/tires-battery" className="hover:text-primary transition-colors">Tires & Battery</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about-us" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{contactDetails.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{contactDetails.mobileNumber}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{contactDetails.email}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Carzzi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
