import jwt from "jsonwebtoken";
import serverConfig from "../config/serverConfig.js";
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async registerUser(user) {
    const existingUser = await this.userRepository.findUser({
      email: user.email,
    });

    if (existingUser) {
      throw { reason: "User with this email already exists", statusCode: 400 };
    }

    const newUser = await this.userRepository.createUser(user);

    if (!newUser) {
      throw { reason: "Error creating user", statusCode: 500 };
    }

    return newUser;
  }


  async loginUser(authDetails) {

    if (!authDetails.email || !authDetails.password) {
        throw {reason: "Email and password are required", statusCode: 400};
    }

    const existingUser = await this.userRepository.findUser(
      { email: authDetails.email },
      true 
    );

    if (!existingUser) {
      throw { reason: "Incorrect email or password", statusCode: 401 };
    }

    const isPasswordCorrect = await existingUser.comparePassword(
      authDetails.password
    );

    if (!isPasswordCorrect) {
      throw { reason: "Incorrect email or password", statusCode: 401 };
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
