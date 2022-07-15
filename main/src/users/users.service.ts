import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async getOneById(id: number): Promise<User> {
    try {
      const user = await this.usersRepository.findOneOrFail(id, {
        relations: ['roles']
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getOneByUsername(
    username: string,
    withPassword = false,
  ): Promise<User> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.username = :username', { username });

    if (withPassword) {
      query.addSelect('user.password');
    }
    const user = await query.getOneOrFail();
    return user;
  }

  async getOneActiveUser(
    username: string,
    withPassword = false,
  ): Promise<User> {
    try {
      const user = await this.getOneByUsername(username, withPassword);
      if (user.isActive) return user;
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async create({ username, password }: { username: string; password: string }) {
    const curUser = await this.usersRepository.findOne({ username });
    if (curUser) {
      const err = 'User already exists.';
      console.log(err);
      throw new Error(err);
    }

    const newUser = this.usersRepository.create({ username, password });
    return this.usersRepository.save(newUser);
  }

  async update(id: number, userParsms: any): Promise<User> {
    const user = await this.getOneById(id);
    const updatedUser = { ...user, ...userParsms };
    return this.usersRepository.save(updatedUser);
  }

  async disableUser(id: number): Promise<User> {
    const userParams = { isActive: false };
    return this.update(id, userParams);
  }
}
