// Next request-context fixture used only by the integration test bundle.
export function cookies() { return { get(name: string) { return name === 'wooplans_session' && process.env.TEST_SESSION_TOKEN ? { value: process.env.TEST_SESSION_TOKEN } : undefined; } }; }
