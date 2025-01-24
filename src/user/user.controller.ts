import { Body, Controller, Post, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserPayload, responseObect } from './dto/user.dto';
import { Response } from 'express';

@Controller('user')
export class UserController {

    constructor(
        private userService: UserService,
    ) { }


    @Post('sign-in')
    async signInUser(
            @Body() loginUserPayload: CreateUserPayload,
            @Res({ passthrough: true }) response: Response,
        ): Promise<responseObect> {
        try {
            const data = await this.userService.loginUser(loginUserPayload)
            const payload = { sub: data['_id'], address: data.address };

            const { accessToken, refreshToken } = await this.userService.signUserdataWithJwt(payload)

            response.cookie('refresh_token', refreshToken, { httpOnly: true,  maxAge: 60 * 1000, secure: true})

            return { message: 'Login Successful', data: { ...data, accessToken } }
        } catch (error) {
            throw error
        }
    }

}
