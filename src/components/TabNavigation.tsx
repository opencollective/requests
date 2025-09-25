import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  id: string;
  label: string;
  path: string;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'community', label: 'Community', path: '/community' },
  { id: 'profile', label: 'Profile', path: '/profile' },
];

export function TabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab =
    tabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'dashboard';

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
