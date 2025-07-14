import { DataSourceHandler } from '../DataSourceHandler';
import { User } from '../entities/User';

/**
 * Inserts a new user into the database.
 * @param userData Partial user data (e.g., lastLogin)
 * @returns The inserted user record
 */
export const createUser = async (userData: Partial<User>) => {
  const dataSource = DataSourceHandler.getInstance().getDataSource();
  const userRepo = dataSource.getRepository(User);

  const user = userRepo.create(userData);
  return await userRepo.save(user);
};

/**
 * Retrieves a user by ID, including related addresses, statuses, and requests.
 * @param id User ID
 * @returns The user or null if not found
 */
export const getUserById = async (id: number) => {
  const dataSource = DataSourceHandler.getInstance().getDataSource();
  return await dataSource.getRepository(User).findOne({
    where: { id },
    relations: ['addresses', 'authStatuses', 'requests'],
  });
};

/**
 * Retrieves all users including their related data.
 * @returns Array of users
 */
export const getAllUsers = async () => {
  const dataSource = DataSourceHandler.getInstance().getDataSource();
  return await dataSource.getRepository(User).find({
    relations: ['addresses', 'authStatuses', 'requests'],
  });
};
