'use strict';
const https = require('https');

/**
 * Get location from IP address using ip-api.com (free, no key required)
 * @param {string} ip - IP address
 * @returns {Promise<{city: string, region: string, country: string, lat: number, lon: number}>}
 */
async function getLocationFromIP(ip) {
  // Skip local/private IPs
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`;
    
    const req = https.get(url.replace('https', 'http'), (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.status === 'success') {
            resolve({
              city: parsed.city,
              region: parsed.regionName,
              country: parsed.country,
              lat: parsed.lat,
              lon: parsed.lon
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => {
      resolve(null);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Parse location string to get coordinates
 * Common format: "City, Country" or "City"
 * Uses approximate coordinates for major Kenyan cities
 */
function parseLocationString(locationStr) {
  if (!locationStr) return null;
  
  const location = locationStr.toLowerCase().trim();
  
  // Major Kenyan cities coordinates
  const cityCoordinates = {
    'nairobi': { lat: -1.286389, lon: 36.817223 },
    'mombasa': { lat: -4.043477, lon: 39.668206 },
    'kisumu': { lat: -0.091702, lon: 34.767956 },
    'nakuru': { lat: -0.303099, lon: 36.080026 },
    'eldoret': { lat: 0.514277, lon: 35.269779 },
    'thika': { lat: -1.033389, lon: 37.069389 },
    'malindi': { lat: -3.219165, lon: 40.116806 },
    'kakamega': { lat: 0.284428, lon: 34.751769 },
    'kitale': { lat: 1.015222, lon: 35.006081 },
    'garissa': { lat: -0.453056, lon: 39.646111 },
  };
  
  // Check if location contains any known city
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (location.includes(city)) {
      return coords;
    }
  }
  
  return null;
}

/**
 * Get client IP from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress;
}

module.exports = {
  getLocationFromIP,
  calculateDistance,
  parseLocationString,
  getClientIP
};
