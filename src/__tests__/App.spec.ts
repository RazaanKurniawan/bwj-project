import { describe, expect, it, vi } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import App from "../App.vue";

vi.mock("../modules/auth/stores/authStore", () => ({
  useAuthStore: () => ({
    user: { value: null },
    profile: { value: null },
    initAuth: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../modules/auth/services/authService", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe("App", () => {
  it("renders navigation links", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          RouterView: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Customer");
    expect(wrapper.text()).toContain("Login");
  });
});
