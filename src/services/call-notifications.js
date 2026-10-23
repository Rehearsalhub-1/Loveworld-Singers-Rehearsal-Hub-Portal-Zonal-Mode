// Simple call notification handler - integrates with existing system

// Handle incoming call notifications
export function handleIncomingCallNotification(payload) {
  const { type, callId, callerName, callerAvatar } = payload.data;

  if (type === 'VOICE_CALL') {


    // Dispatch event for React components
    window.dispatchEvent(new CustomEvent('incomingVoiceCall', {
      detail: {
        callId,
        callerName,
        callerAvatar,
        timestamp: Date.now()
      }
    }));

    // Your existing ringtone will play automatically

  }
}

// Initialize listeners
export function initializeCallNotifications() {
  // This will be called from your main app component

}

// Export default
export default {
  handleIncomingCallNotification,
  initializeCallNotifications
};