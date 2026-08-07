// STUN alone only works when both peers can reach each other directly, which
// held on a shared LAN but breaks once the camera and display are on
// separate networks (mobile data, most home/corporate NATs) — the common
// case once this is deployed publicly. A TURN server relays media when a
// direct path can't be established. This uses Open Relay Project's free
// public TURN server, which is fine for demos/small events; for a
// higher-traffic production deployment, swap in a dedicated TURN provider
// (e.g. Twilio, Xirsys, Metered.ca paid tier, or a self-hosted coturn).
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};
