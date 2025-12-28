import jwt from "jsonwebtoken";
import serverConfig from "../config/serverConfig.js";
import AppError from "../utils/AppError.js";
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async registerUser(user) {
    const existingUser = await this.userRepository.findUser({
      email: user.email,
    });

    if (existingUser) {
      throw new AppError("User with this email already exists", 400);
    }

    const newUser = await this.userRepository.createUser(user);

    if (!newUser) {
      throw new AppError("Error creating user", 500);
    }

    return newUser;
  }

  async loginUser(authDetails) {
    if (!authDetails.email || !authDetails.password) {
      throw new AppError("Email and password are required", 400);
    }

    const existingUser = await this.userRepository.findUser(
      { email: authDetails.email },
      true
    );

    if (!existingUser) {
      throw new AppError("Incorrect email or password", 401);
    }

    const isPasswordCorrect = await existingUser.comparePassword(
      authDetails.password
    );

    if (!isPasswordCorrect) {
      throw new AppError("Incorrect email or password", 401);
    }

    const token = jwt.sign(
      { id: existingUser._id, email: existingUser.email },
      serverConfig.JWT_SECRET,
      { expiresIn: serverConfig.JWT_EXPIRES_IN }
    );

    return {
      token,
      userData: {
        fullName: existingUser.fullName,
        email: existingUser.email,
        id: existingUser._id,
      },
    };
  }

  async countUsers() {
    return await this.userRepository.countAllUsers();
  }

  async getAllUsers() {
    return await this.userRepository.getAllUsers();
  }

  async findUserById(userId) {
    return await this.userRepository.findUser({ _id: userId });
  }
}

export default UserService;
