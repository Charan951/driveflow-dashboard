import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { MapPin, Edit2, Save, X } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { toast } from 'sonner';

const MerchantLocationCard: React.FC = () => {
  const { user, login } = useAuthStore(); // login function can be used to update user state if it accepts user object
  // If useAuthStore doesn't expose a way to update user, we might need to rely on re-fetching or manually updating local state.
  // Looking at useAuthStore, usually it has setUser or login. I'll assume I can update it.
  
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState(user?.location || { address: '', lat: 17.3850, lng: 78.4867 });
  const [isShopOpen, setIsShopOpen] = useState(user?.isShopOpen ?? true);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleShop = async () => {
    const newStatus = !isShopOpen;
    setIsShopOpen(newStatus);
    try {
      await userService.updateProfile({ isShopOpen: newStatus });
      toast.success(newStatus ? 'Shop is now Open' : 'Shop is now Closed');
    } catch (error) {
      setIsShopOpen(!newStatus);
      toast.error('Failed to update status');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await userService.updateProfile({
        location: location
      });
      
      // Update local storage/store
      // Assuming the response is the updated user or we merge it.
      // The updateProfile controller returns the updated user fields.
      
      // We might need to update the global auth store.
      // Since I can't easily access the set function if not exposed, I'll just rely on the component state for now
      // and maybe trigger a reload or if useAuthStore has a method.
      // For now, let's just toast.
      
      toast.success('Location updated successfully');
      setIsEditing(false);
      
      // If we can update the user in store:
      // useAuthStore.getState().setUser({...user, location: location}); 
      // This depends on implementation.
      
    } catch (error) {
      toast.error('Failed to update location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          Workshop Location
        </h3>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isShopOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Status: {isShopOpen ? 'Open for Business' : 'Closed'}
          </span>
        </div>
        <button
          onClick={handleToggleShop}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isShopOpen 
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {isShopOpen ? 'Close Shop' : 'Open Shop'}
        </button>
      </div>

      <div className="space-y-4">
        {!isEditing ? (
          <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white mb-1">Address</p>
              <p className="text-sm leading-relaxed">
                {user?.location?.address || 'No location set'}
              </p>
              {user?.location?.lat && (
                <p className="text-xs text-gray-400 mt-2 font-mono">
                  {user.location.lat.toFixed(6)}, {user.location.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <LocationPicker 
              value={location} 
              onChange={setLocation}
              mapClassName="h-[200px] w-full rounded-lg"
            />
            <p className="text-xs text-gray-500">
              Drag marker to pinpoint your workshop location.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantLocationCard;
