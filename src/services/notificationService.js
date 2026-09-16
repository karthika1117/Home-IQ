import { supabase } from '../lib/supabaseClient';

export async function createNotification(userId, type, title, message, relatedBookingId = null) {
  try {
    const { data, error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      related_booking_id: relatedBookingId,
      read: false
    });
    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to create notification', err);
    return false;
  }
}

export async function generateOpportunityReminder(customerId, appliance, opportunity) {
  const title = `Opportunity: ${opportunity.title}`;
  const message = `Your ${appliance.brand || ''} ${appliance.appliance_type} is ${appliance.health_status}. ${opportunity.suggested_action}`;
  return createNotification(customerId, 'OPPORTUNITY_REMINDER', title, message);
}

