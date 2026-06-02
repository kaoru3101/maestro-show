import {
  getAccessToken,
  getRefreshToken,
  getUser,
  saveTokens,
  clearTokens,
  isLoggedIn,
} from "@/lib/auth";

const mockUser = { id: "uuid-1", name: "テスト管理者", email: "admin@example.com" };

beforeEach(() => {
  localStorage.clear();
});

describe("saveTokens / getAccessToken / getRefreshToken", () => {
  test("トークンを保存して取得できる", () => {
    saveTokens("access-abc", "refresh-xyz", mockUser);
    expect(getAccessToken()).toBe("access-abc");
    expect(getRefreshToken()).toBe("refresh-xyz");
  });
});

describe("getUser", () => {
  test("保存したユーザー情報を取得できる", () => {
    saveTokens("access-abc", "refresh-xyz", mockUser);
    expect(getUser()).toEqual(mockUser);
  });

  test("未保存の場合はnullを返す", () => {
    expect(getUser()).toBeNull();
  });
});

describe("isLoggedIn", () => {
  test("トークンがある場合はtrueを返す", () => {
    saveTokens("access-abc", "refresh-xyz", mockUser);
    expect(isLoggedIn()).toBe(true);
  });

  test("トークンがない場合はfalseを返す", () => {
    expect(isLoggedIn()).toBe(false);
  });
});

describe("clearTokens", () => {
  test("トークンを削除するとisLoggedInがfalseになる", () => {
    saveTokens("access-abc", "refresh-xyz", mockUser);
    clearTokens();
    expect(isLoggedIn()).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});
