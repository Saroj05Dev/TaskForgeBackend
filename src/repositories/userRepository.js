import User from "../schemas/userSchema.js";

class UserRepository {
  async findUser(parameters, includePassword = false) {
    try {
      let query = User.findOne({ ...parameters });

      if (includePassword) {
        query = query.select("+password");
      }

      const existingUser = await query;
      return existingUser;
    } catch (error) {
      throw new Error("Error finding user", error);
    }
  }

  async createUser(user) {
    try {
      const newUser = await User.create(user);
      return newUser;
    } catch (error) {
      console.log(error);
      throw new Error("Error creating user", error);
    }
  }

  async countAllUsers() {
    try {
      const totalUsers = await User.countDocuments();
      return totalUsers;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getAllUsers() {
    return await User.find({}, "_id fullName email");
    // just return necessary fields
  }

  async findUserById(userId) {
    try {
      const user = await User.findById(userId, "_id fullName email");
      return user;
    } catch (error) {
      throw new Error("Error finding user by ID: " + error.message);
    }
  }
}

export default UserRepository;
