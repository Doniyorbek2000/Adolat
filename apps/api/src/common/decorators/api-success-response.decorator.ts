import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

/**
 * Swagger uchun: javobni `ResponseInterceptor` chiqaradigan
 * { success, data, message, timestamp } konvertiga moslab hujjatlaydi.
 *
 * Misol: @ApiSuccessResponse(UserDto)  yoki  @ApiSuccessResponse([UserDto])
 */
class SuccessEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Muvaffaqiyatli' })
  message!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export function ApiSuccessResponse(model?: Type<unknown> | [Type<unknown>]): MethodDecorator {
  if (!model) {
    return applyDecorators(
      ApiExtraModels(SuccessEnvelopeDto),
      ApiOkResponse({ schema: { allOf: [{ $ref: getSchemaPath(SuccessEnvelopeDto) }] } }),
    );
  }

  const isArray = Array.isArray(model);
  const item = isArray ? model[0] : model;

  return applyDecorators(
    ApiExtraModels(SuccessEnvelopeDto, item),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessEnvelopeDto) },
          {
            properties: {
              data: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(item) } }
                : { $ref: getSchemaPath(item) },
            },
          },
        ],
      },
    }),
  );
}
