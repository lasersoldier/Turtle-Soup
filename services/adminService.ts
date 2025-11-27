import { supabase } from '../lib/supabase';

export interface AdminService {
  isAdmin(userId: string): Promise<boolean>;
  getUserRole(userId: string): Promise<'admin' | 'user' | 'guest'>;
  setUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean>;
  setUserRoleByEmail(email: string, role: 'admin' | 'user'): Promise<boolean>;
  getCurrentUserRole(): Promise<'admin' | 'user' | 'guest'>;
  getAdminList(): Promise<string[]>;
}

/**
 * 管理员权限服务 - 使用Supabase用户元数据
 */
export const adminService: AdminService = {
  /**
   * 检查当前用户是否为管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId);
      return role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  /**
   * 获取用户角色
   */
  async getUserRole(userId: string): Promise<'admin' | 'user' | 'guest'> {
    try {
      // 从Supabase获取用户信息，包含元数据
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('Error fetching user:', error);
        return 'guest';
      }

      // 首先检查 app_metadata（这是Supabase Dashboard中raw_app_meta_data的位置）
      let userRole = (user.app_metadata?.role) as 'admin' | 'user' | 'guest';
      
      // 如果app_metadata中没有，再检查user_metadata（向后兼容）
      if (!userRole) {
        userRole = (user.user_metadata?.role || user.user_metadata?.role_type) as 'admin' | 'user' | 'guest';
      }
      
      return userRole || 'user'; // 默认为普通用户
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'guest';
    }
  },

  /**
   * 设置用户角色（需要管理员权限）
   */
  async setUserRole(targetUserId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      // 获取当前用户
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('未登录');
      }

      // 检查当前用户是否为管理员
      const currentUserRole = await this.getUserRole(currentUser.id);
      if (currentUserRole !== 'admin') {
        throw new Error('无权限执行此操作');
      }

      // 使用Supabase Admin API更新用户元数据
      // 注意：这需要服务角色密钥，暂时用客户端方法
      const { error } = await supabase.auth.updateUser({
        data: { role }
      });

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      return false;
    }
  },

  /**
   * 获取当前登录用户的角色
   */
  async getCurrentUserRole(): Promise<'admin' | 'user' | 'guest'> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'guest';
      return this.getUserRole(user.id);
    } catch (error) {
      console.error('Error getting current user role:', error);
      return 'guest';
    }
  },

  /**
   * 根据邮箱设置用户角色
   */
  async setUserRoleByEmail(email: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      // 获取当前用户
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('未登录');
      }

      // 检查当前用户是否为管理员
      const currentUserRole = await this.getUserRole(currentUser.id);
      if (currentUserRole !== 'admin') {
        throw new Error('无权限执行此操作');
      }

      // 注意：这个方法在实际生产环境中需要使用Supabase Admin API
      // 目前我们使用客户端方法，这可能不会成功更新其他用户的角色
      alert(`权限设置：${email} 将被设置为 ${role}。\n注意：此功能需要服务器端权限。`);
      
      return false; // 暂时返回false，因为客户端无法直接修改其他用户的数据
    } catch (error) {
      console.error('Error setting user role by email:', error);
      return false;
    }
  },

  /**
   * 获取管理员列表（简化实现）
   * 在实际环境中，这个方法需要服务器端查询所有用户
   */
  async getAdminList(): Promise<string[]> {
    try {
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      // 检查当前用户是否为管理员
      const currentUserRole = await this.getUserRole(user.id);
      if (currentUserRole !== 'admin') {
        return [];
      }

      // 如果是管理员，返回当前管理员邮箱（简化实现）
      // 在实际环境中，这里应该查询所有管理员用户
      return [user.email || 'admin@example.com'];
    } catch (error) {
      console.error('Error getting admin list:', error);
      return [];
    }
  }
};

/**
 * 简化版检查函数 - 用于组件中使用
 */
export const useAdminCheck = () => {
  return {
    checkIsAdmin: async (userId: string) => adminService.isAdmin(userId),
    getCurrentRole: () => adminService.getCurrentUserRole()
  };
};