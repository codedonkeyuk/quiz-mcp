# Database

This database project is only suitable for a home setup / local network only, not a public server because it wont handle the traffic. You can easily switch this project a robust database by changing the kysely driver. Kysely was designed to work with most databases, I have not tested it yet. Not 100% on how easy that is.

## Setup database in tool or module

```ts
import { db } from "@mcp/database";

export interface WeatherSchema {
  weather_cache: {
    city: string;
    temperature: number;
    updated_at: string;
  };
}

export const toolDb = await db<WeatherSchema>(
  "/app/data/weather.sqlite",
  async (schema) => {
    await schema
      .createTable("weather_cache")
      .ifNotExists()
      .addColumn("city", "text", (cb) => cb.primaryKey())
      .addColumn("temperature", "real", (cb) => cb.notNull())
      .addColumn("updated_at", "text", (cb) =>
        cb.defaultTo("CURRENT_TIMESTAMP"),
      )
      .execute();
  },
);
```

## Select data

```ts
export async function getWeather(city: string) {
  return await toolDb
    .selectFrom("weather_cache")
    .selectAll()
    .where("city", "=", city)
    .executeTakeFirst(); // Returns a typed row or undefined
}
```

## Insert data

```ts
export async function cacheWeather(city: string, temperature: number) {
  await toolDb
    .insertInto("weather_cache")
    .values({ city, temperature }) // 'updated_at' auto-fills natively!
    .execute();
}
```

## Delete data

```ts
export async function deleteWeather(city: string) {
  const result = await toolDb
    .deleteFrom("weather_cache")
    .where("city", "=", city)
    .executeTakeFirst();

  // result.numDeletedRows will tell you if anything was actually deleted
  return result.numDeletedRows > 0n;
}
```
