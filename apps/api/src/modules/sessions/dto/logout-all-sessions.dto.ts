import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class LogoutAllSessionsDto {
  @ApiPropertyOptional({
    description: "Joriy sessiyani ham bekor qilish kerakmi (true bo'lsa, joriy sessiya ham tugatiladi)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCurrent?: boolean;
}
