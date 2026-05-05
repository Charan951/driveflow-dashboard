import { getDataFromS3, saveDataToS3 } from '../utils/s3Storage.js';
import { emitEntitySync } from '../utils/syncService.js';

const HERO_CONFIG_KEY = 'hero_config.json';

// @desc    Get hero settings from S3
// @route   GET /api/hero
// @access  Public
export const getHeroSettings = async (req, res) => {
  try {
    const data = await getDataFromS3(HERO_CONFIG_KEY);
    if (!data) {
      // Return defaults if not in S3 yet
      return res.json({
        homeSlides: [],
        pageHeroes: {},
        contactDetails: {
          address: 'Plot no 71 & 72, 3rd Floor, Phase IV, IDA Cherlapally, Hyderabad- 500051',
          mobileNumber: '+91 9849964945',
          email: 'info@carzzi.com',
        },
      });
    }
    res.json({
      ...data,
      contactDetails: {
        address: data?.contactDetails?.address || 'Plot no 71 & 72, 3rd Floor, Phase IV, IDA Cherlapally, Hyderabad- 500051',
        mobileNumber: data?.contactDetails?.mobileNumber || '+91 9849964945',
        email: data?.contactDetails?.email || 'info@carzzi.com',
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update hero settings in S3
// @route   PUT /api/hero
// @access  Private/Admin
export const updateHeroSettings = async (req, res) => {
  try {
    const { homeSlides, pageHeroes, contactDetails } = req.body;
    const config = {
      homeSlides,
      pageHeroes,
      contactDetails: {
        address: contactDetails?.address || '',
        mobileNumber: contactDetails?.mobileNumber || '',
        email: contactDetails?.email || '',
      },
      updatedAt: new Date().toISOString()
    };
    
    await saveDataToS3(HERO_CONFIG_KEY, config);

    // Global Real-time Sync
    emitEntitySync('hero', 'updated', config);

    res.json({ message: 'Hero settings updated in S3', config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
