export function calculateApplianceHealth(appliance, recentNotes = '') {
  let score = 100;
  
  // 1. Age penalty
  if (appliance.installation_date) {
    const installDate = new Date(appliance.installation_date);
    const today = new Date();
    const ageInYears = (today - installDate) / (1000 * 60 * 60 * 24 * 365);
    score -= Math.max(0, Math.floor(ageInYears * 5)); // 5 points per year
  }

  // 2. Last service penalty
  if (appliance.last_service_date) {
    const lastService = new Date(appliance.last_service_date);
    const today = new Date();
    const daysSinceService = (today - lastService) / (1000 * 60 * 60 * 24);
    if (daysSinceService > 180) {
      score -= Math.floor((daysSinceService - 180) / 10); // 1 point per 10 days over 6 months
    }
  } else {
    // No service history
    score -= 15; 
  }

  // 3. Notes penalty
  const notes = (recentNotes + ' ' + (appliance.technician_notes || '')).toLowerCase();
  const negativeKeywords = ['leak', 'noise', 'vibration', 'issue', 'poor', 'replace', 'broken', 'slow', 'warning', 'maintenance'];
  
  negativeKeywords.forEach(keyword => {
    if (notes.includes(keyword)) {
      score -= 8;
    }
  });

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  let status = 'GOOD';
  if (score < 40) status = 'OVERDUE';
  else if (score < 70) status = 'DUE_SOON';

  return { score, status };
}

export function detectRevenueOpportunity(appliance, healthStatus) {
  if (healthStatus === 'GOOD') {
    return null; // No opportunity
  }

  const type = healthStatus === 'OVERDUE' ? 'MAINTENANCE' : 'CHECKUP';
  const priority = healthStatus === 'OVERDUE' ? 'High' : 'Medium';
  const title = `${appliance.appliance_type} ${healthStatus === 'OVERDUE' ? 'Requires Urgent Maintenance' : 'Due for Checkup'}`;
  
  let reason = '';
  if (appliance.last_service_date) {
    const lastService = new Date(appliance.last_service_date);
    const months = Math.floor((new Date() - lastService) / (1000 * 60 * 60 * 24 * 30));
    reason = `Last serviced ${months} months ago. `;
  } else {
    reason = 'No recent service history found. ';
  }

  if (appliance.technician_notes) {
    reason += 'Previous issues noted. ';
  }

  const description = `${appliance.brand || ''} ${appliance.appliance_type} health score is low. ${reason.trim()}`;
  const suggested_action = healthStatus === 'OVERDUE' ? 'Book Maintenance Now' : 'Schedule AMC / Checkup';

  return {
    type,
    title,
    description,
    priority,
    suggested_action
  };
}

