import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function OnboardingCheck() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip check for certain pages
    const skipPages = ['/onboarding', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
    if (skipPages.some(page => location.pathname.startsWith(page))) {
      return;
    }

    // Check if user needs onboarding
    if (user && needsOnboarding(user)) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
}

function needsOnboarding(user) {
  // Check if user has completed required profile fields
  // Note: Name is already collected during signup
  const hasLocation = user.location && user.location.trim().length > 0;
  const hasContact = (user.phone && user.phone.trim()) || (user.whatsapp && user.whatsapp.trim());

  return !hasLocation || !hasContact;
}
