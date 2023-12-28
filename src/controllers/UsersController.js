const { hash, compare } = require("bcryptjs")
const AppError = require("../utils/AppError")
const sqliteConnection = require('../database/sqlite')


class UsersController {
  async create(request, response) {
    const { name, email, password } = request.body

    const database = await sqliteConnection()
    const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if(checkUserExists){
      throw new AppError("This email is already in use.")
    }

    const hashedPassword = await hash(password, 8)

    await database.run(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
      )

    return response.status(201).json()
  }

  async update(request, response) {
    const { name, email, password, old_password } = request.body
    const user_id = request.user.id

    const database = await sqliteConnection()
    const user = await database.get("SELECT * FROM users WHERE ID = (?)", [user_id])

    if(!user) {
      throw new AppError("User not found")      
    }

    const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id){
      throw new AppError("This email is already in use!")
    }

    user.name = name ?? user.name
    user.email = email ?? user.email

    if( password && !old_password) {
      throw new AppError("Please provide the old password to set the new password.")
    }

    if(password && old_password) {
      const checkOldPassword = await compare(old_password, user.password)

      if(!checkOldPassword) {
        throw new AppError("The old password does not match.")
      }

      user.password = await hash(password, 8)
    }



    await database.run(`
      UPDATE users SET
      name = ?,
      email = ?,
      password = ?,
      updated_at = DATETIME('NOW')
      WHERE id = ?`,
      [user.name, user.email, user.password, user_id]
      )

      return response.json()
  }
}

module.exports = UsersController


