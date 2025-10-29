class UserController {
    constructor(userService) {
        this.userService = userService;

        this.createUser = this.createUser.bind(this);
        this.login = this.login.bind(this)
        this.logout = this.logout.bind(this)
        this.countAllUsers = this.countAllUsers.bind(this)
        this.getCurrentUser = this.getCurrentUser.bind(this)
        this.getAllUsers = this.getAllUsers.bind(this)
    }

    async createUser (req, res) {
        const user = req.body;
        try {
            const newUser = await this.userService.registerUser(user);
            res.status(201).json({
                success: true,
                message: "User created successfully",
                data: newUser
            })
        } catch (error) {
            console.log(error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.reason || error.message,
                data: {},
            })
        }
    }

    async login (req, res) {
        const authDetails = req.body;
        try {
            const user = await this.userService.loginUser(authDetails);

            res.cookie("authToken", user.token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 1 * 24 * 60 * 60 * 1000 // 1 days
            })

            res.status(200).json({
                success: true,
                message: "User logged in successfully",
                data: user,
                error: {}
            })

        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.reason || error.message,
                data: {},
                error: error
            })
        }
    }

    async countAllUsers (req, res) {
        try {
            const count = await this.userService.countUsers();
            res.status(200).json({
                success: true,
                message: "User count found successfully",
                data: count,
                error: {}
            })
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
                data: {},
                error: error
            })
        }
    }

    async getCurrentUser (req, res) {
    const userId = req.user.id;
    try {
        const user = await this.userService.findUserById(userId);
        const { _id, fullName, email, role } = user;
        res.status(200).json({
            success: true,
            message: "User found successfully",
            data: {
                id: _id,      
                fullName,
                email,
                role
            }
        })
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
            data: {},
            error: error
        })
    }
}

    async getAllUsers (req, res) {
        try {
            const users = await this.userService.getAllUsers();
            res.status(200).json({
                success: true,
                message: "Users found successfully",
                data: users,
                error: {}
            })
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
                data: {},
                error: error
            })
        }
    }

    async logout (req, res) {
        res.cookie("authToken", "", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 0
        })

        res.status(200).json({
            success: true,
            message: "User logged out successfully",
            data: {},
            error: {}
        })
    }
}

export default UserController;
