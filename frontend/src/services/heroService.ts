import api from './api';

export interface HeroSlide {
  id: string | number;
  image: string;
  title?: string;
  titleWhite: string;
  titleBlue: string;
  subtitle: string;
}

export interface PageHero {
  page: string;
  image: string;
  title: string;
  subtitle: string;
}

export interface HeroConfig {
  homeSlides: HeroSlide[];
  pageHeroes: Record<string, PageHero>;
  contactDetails: {
    address: string;
    mobileNumber: string;
    email: string;
  };
  showGetStarted: boolean;
  showLearnMore: boolean;
}

export const heroService = {
  getHeroSettings: async (): Promise<HeroConfig> => {
    const response = await api.get('/hero');
    return response.data;
  },
  updateHeroSettings: async (data: HeroConfig) => {
    const response = await api.put('/hero', data);
    return response.data;
  },
};
