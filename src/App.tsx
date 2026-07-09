import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KundenverwaltungPage from '@/pages/KundenverwaltungPage';
import KundenverwaltungDetailPage from '@/pages/KundenverwaltungDetailPage';
import WartungsvertraegePage from '@/pages/WartungsvertraegePage';
import WartungsvertraegeDetailPage from '@/pages/WartungsvertraegeDetailPage';
import PublicFormKundenverwaltung from '@/pages/public/PublicForm_Kundenverwaltung';
import PublicFormWartungsvertraege from '@/pages/public/PublicForm_Wartungsvertraege';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a4f44bc95142d55b64a3861" element={<PublicFormKundenverwaltung />} />
              <Route path="public/6a4f44bebe3ad15592c09ac1" element={<PublicFormWartungsvertraege />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kundenverwaltung" element={<KundenverwaltungPage />} />
                <Route path="kundenverwaltung/:id" element={<KundenverwaltungDetailPage />} />
                <Route path="wartungsvertraege" element={<WartungsvertraegePage />} />
                <Route path="wartungsvertraege/:id" element={<WartungsvertraegeDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
