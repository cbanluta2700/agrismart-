import { useState, useEffect, useMemo } from 'react';
import { ResourceStatus, ResourceType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { 
  CheckIcon, 
  XMarkIcon, 
  ArchiveBoxIcon, 
  StarIcon, 
  FunnelIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
};

type BulkModerationAction = 'approve' | 'reject' | 'archive' | 'feature' | 'unfeature';

const statusColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  PENDING: 'bg-yellow-200 text-yellow-800',
  PUBLISHED: 'bg-green-200 text-green-800',
  REJECTED: 'bg-red-200 text-red-800',
  ARCHIVED: 'bg-gray-300 text-gray-800',
  FEATURED: 'bg-purple-200 text-purple-800',
};

const typeLabels = {
  ARTICLE: 'Article',
  GUIDE: 'Guide',
  VIDEO: 'Video',
  GLOSSARY: 'Glossary Term',
};

export default function BulkModerationPanel() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [filters, setFilters] = useState({
    types: [] as ResourceType[],
    statuses: [] as ResourceStatus[],
    fromDate: '',
    toDate: '',
    searchTerm: '',
    authorId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Load resources on component mount and when filters change
  useEffect(() => {
    fetchResources();
  }, [filters]);
  
  // Fetch resources from the API based on filters
  const fetchResources = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Build query params from filters
      const queryParams = new URLSearchParams();
      
      if (filters.types.length > 0) {
        filters.types.forEach(type => queryParams.append('types', type));
      }
      
      if (filters.statuses.length > 0) {
        filters.statuses.forEach(status => queryParams.append('statuses', status));
      }
      
      if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
      if (filters.toDate) queryParams.append('toDate', filters.toDate);
      if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm);
      if (filters.authorId) queryParams.append('authorId', filters.authorId);
      
      const response = await fetch(`/api/admin/resources/bulk-moderate?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }
      
      const data = await response.json();
      setResources(data.resources);
      
      // Reset selected IDs when resources change
      setSelectedIds([]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error fetching resources' });
    } finally {
      setLoading(false);
    }
  };
  
  // Perform bulk moderation action
  const performAction = async (action: BulkModerationAction) => {
    if (selectedIds.length === 0) {
      setMessage({ type: 'error', text: 'No resources selected' });
      return;
    }
    
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('/api/admin/resources/bulk-moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceIds: selectedIds,
          action,
          reason: `Bulk ${action} action by moderator`,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Action failed');
      }
      
      const result = await response.json();
      setMessage({ 
        type: 'success', 
        text: `${result.processed} resources processed successfully. ${result.failed} failed.` 
      });
      
      // Refresh resources list
      fetchResources();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error performing action' });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Toggle selection of a resource
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };
  
  // Toggle selection of all resources
  const toggleSelectAll = () => {
    if (selectedIds.length === resources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resources.map(r => r.id));
    }
  };
  
  // Update filter state
  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Toggle filter array values (for types and statuses)
  const toggleArrayFilter = (key: 'types' | 'statuses', value: any) => {
    setFilters(prev => {
      const currentValues = prev[key];
      return {
        ...prev,
        [key]: currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value]
      };
    });
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      types: [],
      statuses: [],
      fromDate: '',
      toDate: '',
      searchTerm: '',
      authorId: '',
    });
  };
  
  // Check if a resource type is in the filter
  const isTypeSelected = (type: ResourceType) => filters.types.includes(type);
  
  // Check if a resource status is in the filter
  const isStatusSelected = (status: ResourceStatus) => filters.statuses.includes(status);
  
  // Computed value for select all checkbox state
  const allSelected = useMemo(() => 
    resources.length > 0 && selectedIds.length === resources.length,
    [resources, selectedIds]
  );
  
  // Count of selected resources by status (for action button tooltips)
  const selectedStatusCounts = useMemo(() => {
    const counts = {
      DRAFT: 0,
      PENDING: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      ARCHIVED: 0,
      FEATURED: 0,
    };
    
    if (selectedIds.length === 0) return counts;
    
    selectedIds.forEach(id => {
      const resource = resources.find(r => r.id === id);
      if (resource) {
        counts[resource.status]++;
      }
    });
    
    return counts;
  }, [selectedIds, resources]);
  
  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Bulk Resource Moderation</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <FunnelIcon className="w-5 h-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-700">Filters</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Resource Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Types
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayFilter('types', type)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      isTypeSelected(type as ResourceType)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Resource Statuses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Statuses
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(statusColors).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleArrayFilter('statuses', status)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      isStatusSelected(status as ResourceStatus)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {status.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Date Range */}
            <div className="flex flex-col space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={e => updateFilter('fromDate', e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={e => updateFilter('toDate', e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="To"
                />
              </div>
            </div>
            
            {/* Search Term */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={e => updateFilter('searchTerm', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="Search by title or description"
                />
                <button
                  onClick={fetchResources}
                  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => performAction('approve')}
          disabled={actionLoading || selectedIds.length === 0}
          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Approve ${selectedIds.length} resources (${selectedStatusCounts.DRAFT + selectedStatusCounts.PENDING} eligible)`}
        >
          <CheckIcon className="w-5 h-5" />
          Approve ({selectedIds.length})
        </button>
        
        <button
          onClick={() => performAction('reject')}
          disabled={actionLoading || selectedIds.length === 0}
          className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Reject ${selectedIds.length} resources`}
        >
          <XMarkIcon className="w-5 h-5" />
          Reject ({selectedIds.length})
        </button>
        
        <button
          onClick={() => performAction('archive')}
          disabled={actionLoading || selectedIds.length === 0}
          className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Archive ${selectedIds.length} resources`}
        >
          <ArchiveBoxIcon className="w-5 h-5" />
          Archive ({selectedIds.length})
        </button>
        
        <button
          onClick={() => performAction('feature')}
          disabled={actionLoading || selectedIds.length === 0}
          className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Feature ${selectedIds.length} resources (${selectedStatusCounts.PUBLISHED} eligible)`}
        >
          <StarIcon className="w-5 h-5" />
          Feature ({selectedIds.length})
        </button>
        
        <button
          onClick={() => performAction('unfeature')}
          disabled={actionLoading || selectedIds.length === 0}
          className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Remove featured status from ${selectedIds.length} resources (${selectedStatusCounts.FEATURED} eligible)`}
        >
          <StarIcon className="w-5 h-5 line-through" />
          Unfeature ({selectedIds.length})
        </button>
      </div>
      
      {/* Status Message */}
      {message.text && (
        <div className={`p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Resources Table */}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                  Loading resources...
                </td>
              </tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                  No resources found matching your criteria.
                </td>
              </tr>
            ) : (
              resources.map(resource => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(resource.id)}
                      onChange={() => toggleSelection(resource.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {resource.title}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {typeLabels[resource.type]}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[resource.status]}`}>
                      {resource.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{resource.author.name}</div>
                    <div className="text-xs text-gray-500">{resource.author.email}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(resource.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
