import React from 'react';
import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

const AdminPlaceholder: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-muted/30 p-8 rounded-full mb-6"
      >
        <Construction className="w-16 h-16 text-muted-foreground" />
      </motion.div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">
        This module is currently under development. Check back soon for updates.
      </p>
    </div>
  );
};

export default AdminPlaceholder;
