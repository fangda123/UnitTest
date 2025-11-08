import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Users, Search, Trash2, Lock, Unlock, RefreshCw, Shield, User, AlertCircle } from 'lucide-react';
import DataTable from '../components/Table/DataTable';
import type { TableColumn, TableRow } from '../components/Table/DataTable';

/**
 * หน้า User Management (Admin Only)
 * ตาม Postman:
 * - GET /api/users (Get All)
 * - GET /api/users/:id
 * - PUT /api/users/:id (Update)
 * - DELETE /api/users/:id
 * - PATCH /api/users/:id/toggle-status
 * - GET /api/users?search=...
 * - GET /api/users?role=...
 */

interface UserData {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile?: {
    phone?: string;
    address?: string;
  };
}

function UsersManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      let response;
      if (roleFilter !== 'all') {
        response = await userAPI.filterByRole(roleFilter as 'user' | 'admin');
      } else if (searchQuery) {
        response = await userAPI.search(searchQuery);
      } else {
        response = await userAPI.getAll({ page: 1, limit: 100 });
      }
      setUsers(response.data.data?.users || response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleToggleStatus = async (userId: string) => {
    if (!confirm('ต้องการเปลี่ยนสถานะผู้ใช้นี้หรือไม่?')) return;
    
    try {
      await userAPI.toggleStatus(userId);
      fetchUsers(); // Refresh
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ต้องการลบผู้ใช้นี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    
    try {
      await userAPI.delete(userId);
      fetchUsers(); // Refresh
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('ไม่สามารถลบผู้ใช้ได้');
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'username',
      label: 'Username',
      width: 150,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            row.role === 'admin' ? 'bg-gradient-to-br from-warning to-danger' : 'bg-gradient-to-br from-primary-600 to-primary-500'
          }`}>
            {row.role === 'admin' ? (
              <Shield className="w-4 h-4 text-white" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-semibold">{value}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      width: 250,
      sortable: true,
    },
    {
      key: 'firstName',
      label: 'ชื่อ',
      width: 150,
      sortable: true,
    },
    {
      key: 'lastName',
      label: 'นามสกุล',
      width: 150,
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      width: 100,
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          value === 'admin' 
            ? 'bg-warning/20 text-warning' 
            : 'bg-primary-500/20 text-primary-400'
        }`}>
          {value === 'admin' ? 'ADMIN' : 'USER'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      width: 120,
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          value 
            ? 'bg-success/20 text-success' 
            : 'bg-danger/20 text-danger'
        }`}>
          {value ? 'ACTIVE' : 'INACTIVE'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      width: 150,
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('th-TH'),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 150,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleStatus(row._id)}
            className={`p-2 rounded-lg transition-colors ${
              row.isActive
                ? 'bg-warning/20 text-warning hover:bg-warning/30'
                : 'bg-success/20 text-success hover:bg-success/30'
            }`}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleDeleteUser(row._id)}
            className="p-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const tableData: TableRow[] = users.map(user => ({
    id: user._id,
    ...user,
    expandedContent: (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">ID:</span>
          <span className="ml-2 text-gray-300 font-mono text-xs">{user._id}</span>
        </div>
        <div>
          <span className="text-gray-500">Phone:</span>
          <span className="ml-2 text-gray-300">{user.profile?.phone || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Address:</span>
          <span className="ml-2 text-gray-300">{user.profile?.address || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 text-gray-300">{new Date(user.createdAt).toLocaleString('th-TH')}</span>
        </div>
      </div>
    ),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-500" />
              User Management
            </h1>
            <p className="text-gray-400">จัดการผู้ใช้ทั้งหมดในระบบ (Admin Only)</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="ค้นหา username, email, ชื่อ..."
                className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Search
            </button>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User Only</option>
              <option value="admin">Admin Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <p className="text-gray-400 text-sm mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-100">{users.length}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <p className="text-gray-400 text-sm mb-1">Active Users</p>
          <p className="text-3xl font-bold text-success">
            {users.filter(u => u.isActive).length}
          </p>
        </div>
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <p className="text-gray-400 text-sm mb-1">Admins</p>
          <p className="text-3xl font-bold text-warning">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <p className="text-gray-400 text-sm mb-1">Inactive Users</p>
          <p className="text-3xl font-bold text-danger">
            {users.filter(u => !u.isActive).length}
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-warning/10 border border-warning/50 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm text-warning">
          <p className="font-semibold mb-1">Admin Only Feature</p>
          <p>คุณสามารถจัดการผู้ใช้ทั้งหมด รวมถึงการระงับ/เปิดใช้งาน และลบผู้ใช้ได้</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        title={`Users (${users.length})`}
        columns={columns}
        data={tableData}
        expandable={true}
        pagination={true}
        itemsPerPage={10}
      />
    </div>
  );
}

export default UsersManagementPage;

