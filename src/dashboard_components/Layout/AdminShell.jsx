'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  clearOwnerSession,
  expireOwnerSession,
  getOwnerSession,
  getOwnerSessionExpiresAt,
  isOwnerSessionExpired,
  OWNER_SESSION_EXPIRED_EVENT,
} from '@/shared/lib/ownerSession';
import { logoutOwner, resetOwnerIdentity } from '@/shared/lib/ownerProfile';
import { AdminHeader } from '@/dashboard_components/Layout/AdminHeader';
import { AdminSidebar } from '@/dashboard_components/Layout/AdminSidebar';
import { AdminFooter } from '@/dashboard_components/Layout/AdminFooter';
import { AdminBootLoader } from '@/dashboard_components/Layout/AdminBootLoader';
import { AdminLoginPage } from '@/dashboard_components/Login/AdminLoginPage';
import { pathnameToTabId, tabIdToHref } from '@/dashboard_components/adminRoutes';
import { OwnerNotificationsProvider } from '@/contexts/OwnerNotificationsContext';
import { AdminOrderBridgeContext } from '@/dashboard_components/Layout/adminOrderBridge';

export { useAdminOrderBridge } from '@/dashboard_components/Layout/adminOrderBridge';

export function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    activeAdminTab,
    setActiveAdminTab,
    isAdminLoggedIn,
    isAdminAuthReady,
    setIsAdminLoggedIn,
    adminTheme,
  } = useRestaurant();

  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const tabFromUrl = pathnameToTabId(pathname || '/admin');

  const handleTabsLoaded = useCallback((tabIds) => {
    setAllowedTabs(tabIds);
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn) return;
    if (tabFromUrl && tabFromUrl !== activeAdminTab) {
      setActiveAdminTab(tabFromUrl);
    }
  }, [tabFromUrl, activeAdminTab, setActiveAdminTab, isAdminLoggedIn]);

  useEffect(() => {
    if (!isAdminLoggedIn || allowedTabs === null) return;
    const atAdminRoot = pathname === '/admin' || pathname === '/admin/';
    const tabAllowed =
      allowedTabs.length === 0 || allowedTabs.includes(tabFromUrl);
    if (atAdminRoot) {
      const fallback = allowedTabs[0] || 'dashboard';
      router.replace(tabIdToHref(fallback));
      return;
    }
    if (allowedTabs.length > 0 && !tabAllowed) {
      router.replace(tabIdToHref(allowedTabs[0]));
    }
  }, [isAdminLoggedIn, allowedTabs, pathname, tabFromUrl, router]);

  const handleLogout = () => {
    void logoutOwner().finally(() => {
      resetOwnerIdentity();
      clearOwnerSession();
      setAllowedTabs(null);
      setActiveAdminTab('dashboard');
      setIsAdminLoggedIn(false);
      router.replace('/admin/dashboard');
    });
  };

  const handleSessionExpired = useCallback(() => {
    resetOwnerIdentity();
    setAllowedTabs(null);
    setActiveAdminTab('dashboard');
    setIsAdminLoggedIn(false);
  }, [setActiveAdminTab, setIsAdminLoggedIn]);

  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const session = getOwnerSession();
    if (!session) return;
    const enforceExpiry = () => {
      if (isOwnerSessionExpired(session.token)) expireOwnerSession();
    };
    const onSessionExpired = () => handleSessionExpired();
    window.addEventListener(OWNER_SESSION_EXPIRED_EVENT, onSessionExpired);
    window.addEventListener('focus', enforceExpiry);
    document.addEventListener('visibilitychange', enforceExpiry);
    const expiresAt = getOwnerSessionExpiresAt(session.token);
    const timeoutId =
      expiresAt === null
        ? undefined
        : window.setTimeout(enforceExpiry, Math.max(0, expiresAt - Date.now()));
    enforceExpiry();
    return () => {
      window.removeEventListener(OWNER_SESSION_EXPIRED_EVENT, onSessionExpired);
      window.removeEventListener('focus', enforceExpiry);
      document.removeEventListener('visibilitychange', enforceExpiry);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [handleSessionExpired, isAdminLoggedIn]);

  if (!isAdminAuthReady) {
    return (
      <div data-admin-theme={adminTheme} className="min-h-screen">
        <AdminBootLoader />
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div data-admin-theme={adminTheme} className="min-h-screen">
        <AdminLoginPage
          onLoginSuccess={() => {
            setAllowedTabs(null);
            setIsAdminLoggedIn(true);
            const target =
              tabFromUrl && tabFromUrl !== 'dashboard' ? tabFromUrl : 'dashboard';
            router.replace(tabIdToHref(target));
          }}
          onGoToStore={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <AdminOrderBridgeContext.Provider value={{ selectedOrder, setSelectedOrder }}>
      <OwnerNotificationsProvider>
        <div
          data-admin-theme={adminTheme}
          className="h-screen w-full bg-[var(--admin-bg,#000000)] flex text-[var(--admin-text,#ffffff)] font-sans antialiased selection:bg-[#FF5A1F]/30 selection:text-white overflow-hidden"
        >
          <AdminSidebar
            isOpenMobile={isSidebarMobileOpen}
            onCloseMobile={() => setIsSidebarMobileOpen(false)}
            onTabsLoaded={handleTabsLoaded}
            onLogout={handleLogout}
          />

          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--admin-bg,#0D0F12)]">
            <div className="shrink-0 z-30">
              <AdminHeader
                onToggleSidebar={() => setIsSidebarMobileOpen(true)}
                onOpenStore={() => router.push('/')}
                onLogout={handleLogout}
              />
            </div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[var(--admin-bg,#0D0F12)]">
              {allowedTabs === null ? (
                <div
                  role="status"
                  aria-label="Loading workspace"
                  className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-7 w-56 rounded-lg bg-[#191B20]" />
                      <div className="h-3 w-72 max-w-full rounded bg-[#191B20]" />
                    </div>
                    <div className="h-10 w-36 rounded-xl bg-[#191B20]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="h-28 rounded-2xl border border-[#292D35] bg-[#14171C]"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                children
              )}
            </main>

            <div className="shrink-0 z-20">
              <AdminFooter />
            </div>
          </div>
        </div>
      </OwnerNotificationsProvider>
    </AdminOrderBridgeContext.Provider>
  );
}
