import User from './user.model';
import Role from './role.model';
import UserRole from './user-role.model';
import RefreshToken from './refresh-token.model';
import Folder from './folder.model';
import File from './file.model';
import FileVersion from './file-version.model';

// Export all models
export { User, Role, UserRole, RefreshToken, Folder, File, FileVersion };

// Export associations setup
export const setupAssociations = () => {
  // Associations are already defined in individual model files
  // This function can be used for any additional setup if needed
};
