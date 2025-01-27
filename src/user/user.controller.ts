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
            const payload = { id: data['_id'], address: data.address, email: data.email };

            const { accessToken, refreshToken } = await this.userService.signUserdataWithJwt(payload)

            response.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                maxAge: 60 * 1000, //15mins
                // maxAge: 60 * 15 * 1000, //15mins
                secure: false,
                sameSite: 'lax',
                path: '/'
            })

            return { message: 'Login Successful', data: { ...data, accessToken } }
        } catch (error) {
            throw error
        }
    }

}
