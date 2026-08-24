const isProduction = window.location.hostname !== 'localhost';

export const baseURL = isProduction 
  ? 'https://backendengr-be.onrender.com'   
  : 'http://localhost:4500';  