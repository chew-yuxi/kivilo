
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Stakeholder
 * 
 */
export type Stakeholder = $Result.DefaultSelection<Prisma.$StakeholderPayload>
/**
 * Model Property
 * The durable hub. Outlives every relationship on it.
 */
export type Property = $Result.DefaultSelection<Prisma.$PropertyPayload>
/**
 * Model Tenancy
 * 
 */
export type Tenancy = $Result.DefaultSelection<Prisma.$TenancyPayload>
/**
 * Model Inspection
 * 
 */
export type Inspection = $Result.DefaultSelection<Prisma.$InspectionPayload>
/**
 * Model Capture
 * The evidence. AI is the scribe; this is the witness.
 * Captures belong to a room, not to the inspection, so an inspector can re-shoot
 * one room without disturbing rooms already reviewed.
 */
export type Capture = $Result.DefaultSelection<Prisma.$CapturePayload>
/**
 * Model Room
 * 
 */
export type Room = $Result.DefaultSelection<Prisma.$RoomPayload>
/**
 * Model InspectionItem
 * 
 */
export type InspectionItem = $Result.DefaultSelection<Prisma.$InspectionItemPayload>
/**
 * Model Finding
 * Check-out only. The dispute moment, drafted by the model and owned by a human.
 */
export type Finding = $Result.DefaultSelection<Prisma.$FindingPayload>
/**
 * Model Signature
 * 
 */
export type Signature = $Result.DefaultSelection<Prisma.$SignaturePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const StakeholderKind: {
  INDIVIDUAL: 'INDIVIDUAL',
  ENTITY: 'ENTITY'
};

export type StakeholderKind = (typeof StakeholderKind)[keyof typeof StakeholderKind]


export const PropertyType: {
  HDB: 'HDB',
  PRIVATE_NON_LANDED: 'PRIVATE_NON_LANDED',
  LANDED: 'LANDED',
  COMMERCIAL: 'COMMERCIAL'
};

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]


export const InspectionKind: {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT'
};

export type InspectionKind = (typeof InspectionKind)[keyof typeof InspectionKind]


export const InspectionStatus: {
  DRAFT: 'DRAFT',
  CAPTURING: 'CAPTURING',
  PROCESSING: 'PROCESSING',
  REVIEW: 'REVIEW',
  AWAITING_SIGNATURE: 'AWAITING_SIGNATURE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus]


export const CaptureKind: {
  VIDEO: 'VIDEO',
  PHOTO: 'PHOTO'
};

export type CaptureKind = (typeof CaptureKind)[keyof typeof CaptureKind]


export const RoomStatus: {
  PENDING: 'PENDING',
  CAPTURING: 'CAPTURING',
  PROCESSING: 'PROCESSING',
  REVIEW: 'REVIEW',
  REVIEWED: 'REVIEWED',
  FAILED: 'FAILED'
};

export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus]


export const ItemCategory: {
  FIXTURE: 'FIXTURE',
  APPLIANCE: 'APPLIANCE',
  FURNITURE: 'FURNITURE',
  SURFACE: 'SURFACE',
  METER: 'METER'
};

export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory]


export const ItemCondition: {
  NEW: 'NEW',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  DAMAGED: 'DAMAGED'
};

export type ItemCondition = (typeof ItemCondition)[keyof typeof ItemCondition]


export const ChangeType: {
  UNCHANGED: 'UNCHANGED',
  WEAR: 'WEAR',
  DAMAGE: 'DAMAGE',
  MISSING: 'MISSING',
  IMPROVED: 'IMPROVED'
};

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType]


export const Verdict: {
  TENANT_LIABLE: 'TENANT_LIABLE',
  FAIR_WEAR: 'FAIR_WEAR',
  DISPUTED: 'DISPUTED',
  UNDECIDED: 'UNDECIDED'
};

export type Verdict = (typeof Verdict)[keyof typeof Verdict]

}

export type StakeholderKind = $Enums.StakeholderKind

export const StakeholderKind: typeof $Enums.StakeholderKind

export type PropertyType = $Enums.PropertyType

export const PropertyType: typeof $Enums.PropertyType

export type InspectionKind = $Enums.InspectionKind

export const InspectionKind: typeof $Enums.InspectionKind

export type InspectionStatus = $Enums.InspectionStatus

export const InspectionStatus: typeof $Enums.InspectionStatus

export type CaptureKind = $Enums.CaptureKind

export const CaptureKind: typeof $Enums.CaptureKind

export type RoomStatus = $Enums.RoomStatus

export const RoomStatus: typeof $Enums.RoomStatus

export type ItemCategory = $Enums.ItemCategory

export const ItemCategory: typeof $Enums.ItemCategory

export type ItemCondition = $Enums.ItemCondition

export const ItemCondition: typeof $Enums.ItemCondition

export type ChangeType = $Enums.ChangeType

export const ChangeType: typeof $Enums.ChangeType

export type Verdict = $Enums.Verdict

export const Verdict: typeof $Enums.Verdict

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Stakeholders
 * const stakeholders = await prisma.stakeholder.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Stakeholders
   * const stakeholders = await prisma.stakeholder.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.PrismaClientConstructorArgs<ClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.stakeholder`: Exposes CRUD operations for the **Stakeholder** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Stakeholders
    * const stakeholders = await prisma.stakeholder.findMany()
    * ```
    */
  get stakeholder(): Prisma.StakeholderDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.property`: Exposes CRUD operations for the **Property** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Properties
    * const properties = await prisma.property.findMany()
    * ```
    */
  get property(): Prisma.PropertyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tenancy`: Exposes CRUD operations for the **Tenancy** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tenancies
    * const tenancies = await prisma.tenancy.findMany()
    * ```
    */
  get tenancy(): Prisma.TenancyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.inspection`: Exposes CRUD operations for the **Inspection** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Inspections
    * const inspections = await prisma.inspection.findMany()
    * ```
    */
  get inspection(): Prisma.InspectionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.capture`: Exposes CRUD operations for the **Capture** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Captures
    * const captures = await prisma.capture.findMany()
    * ```
    */
  get capture(): Prisma.CaptureDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.room`: Exposes CRUD operations for the **Room** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Rooms
    * const rooms = await prisma.room.findMany()
    * ```
    */
  get room(): Prisma.RoomDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.inspectionItem`: Exposes CRUD operations for the **InspectionItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InspectionItems
    * const inspectionItems = await prisma.inspectionItem.findMany()
    * ```
    */
  get inspectionItem(): Prisma.InspectionItemDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.finding`: Exposes CRUD operations for the **Finding** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Findings
    * const findings = await prisma.finding.findMany()
    * ```
    */
  get finding(): Prisma.FindingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.signature`: Exposes CRUD operations for the **Signature** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Signatures
    * const signatures = await prisma.signature.findMany()
    * ```
    */
  get signature(): Prisma.SignatureDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.9.1
   * Query Engine version: e922089b7d7502aff4249d5da3420f6fa55fc6ad
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * Resolved type of the argument passed to the `PrismaClient` constructor.
   *
   * When called without a narrower options type (the common case), this resolves
   * to `PrismaClientOptions` directly, which produces a clear TypeScript error
   * message (`not assignable to parameter of type 'PrismaClientOptions'`) when
   * the argument is missing or incomplete. When the user supplies a narrower
   * options type (e.g. via a literal), it falls back to `Subset` to keep
   * filtering out unknown properties.
   */
  export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> =
    [PrismaClientOptions] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      ((Without<T, U> & U) | (Without<U, T> & T)) & object
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Stakeholder: 'Stakeholder',
    Property: 'Property',
    Tenancy: 'Tenancy',
    Inspection: 'Inspection',
    Capture: 'Capture',
    Room: 'Room',
    InspectionItem: 'InspectionItem',
    Finding: 'Finding',
    Signature: 'Signature'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "stakeholder" | "property" | "tenancy" | "inspection" | "capture" | "room" | "inspectionItem" | "finding" | "signature"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Stakeholder: {
        payload: Prisma.$StakeholderPayload<ExtArgs>
        fields: Prisma.StakeholderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StakeholderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StakeholderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          findFirst: {
            args: Prisma.StakeholderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StakeholderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          findMany: {
            args: Prisma.StakeholderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>[]
          }
          create: {
            args: Prisma.StakeholderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          createMany: {
            args: Prisma.StakeholderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StakeholderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>[]
          }
          delete: {
            args: Prisma.StakeholderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          update: {
            args: Prisma.StakeholderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          deleteMany: {
            args: Prisma.StakeholderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StakeholderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StakeholderUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>[]
          }
          upsert: {
            args: Prisma.StakeholderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StakeholderPayload>
          }
          aggregate: {
            args: Prisma.StakeholderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStakeholder>
          }
          groupBy: {
            args: Prisma.StakeholderGroupByArgs<ExtArgs>
            result: $Utils.Optional<StakeholderGroupByOutputType>[]
          }
          count: {
            args: Prisma.StakeholderCountArgs<ExtArgs>
            result: $Utils.Optional<StakeholderCountAggregateOutputType> | number
          }
        }
      }
      Property: {
        payload: Prisma.$PropertyPayload<ExtArgs>
        fields: Prisma.PropertyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PropertyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PropertyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          findFirst: {
            args: Prisma.PropertyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PropertyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          findMany: {
            args: Prisma.PropertyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>[]
          }
          create: {
            args: Prisma.PropertyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          createMany: {
            args: Prisma.PropertyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PropertyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>[]
          }
          delete: {
            args: Prisma.PropertyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          update: {
            args: Prisma.PropertyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          deleteMany: {
            args: Prisma.PropertyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PropertyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PropertyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>[]
          }
          upsert: {
            args: Prisma.PropertyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PropertyPayload>
          }
          aggregate: {
            args: Prisma.PropertyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProperty>
          }
          groupBy: {
            args: Prisma.PropertyGroupByArgs<ExtArgs>
            result: $Utils.Optional<PropertyGroupByOutputType>[]
          }
          count: {
            args: Prisma.PropertyCountArgs<ExtArgs>
            result: $Utils.Optional<PropertyCountAggregateOutputType> | number
          }
        }
      }
      Tenancy: {
        payload: Prisma.$TenancyPayload<ExtArgs>
        fields: Prisma.TenancyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenancyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenancyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          findFirst: {
            args: Prisma.TenancyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenancyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          findMany: {
            args: Prisma.TenancyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>[]
          }
          create: {
            args: Prisma.TenancyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          createMany: {
            args: Prisma.TenancyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenancyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>[]
          }
          delete: {
            args: Prisma.TenancyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          update: {
            args: Prisma.TenancyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          deleteMany: {
            args: Prisma.TenancyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenancyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenancyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>[]
          }
          upsert: {
            args: Prisma.TenancyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenancyPayload>
          }
          aggregate: {
            args: Prisma.TenancyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenancy>
          }
          groupBy: {
            args: Prisma.TenancyGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenancyGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenancyCountArgs<ExtArgs>
            result: $Utils.Optional<TenancyCountAggregateOutputType> | number
          }
        }
      }
      Inspection: {
        payload: Prisma.$InspectionPayload<ExtArgs>
        fields: Prisma.InspectionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InspectionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InspectionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          findFirst: {
            args: Prisma.InspectionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InspectionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          findMany: {
            args: Prisma.InspectionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>[]
          }
          create: {
            args: Prisma.InspectionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          createMany: {
            args: Prisma.InspectionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InspectionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>[]
          }
          delete: {
            args: Prisma.InspectionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          update: {
            args: Prisma.InspectionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          deleteMany: {
            args: Prisma.InspectionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InspectionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InspectionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>[]
          }
          upsert: {
            args: Prisma.InspectionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionPayload>
          }
          aggregate: {
            args: Prisma.InspectionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInspection>
          }
          groupBy: {
            args: Prisma.InspectionGroupByArgs<ExtArgs>
            result: $Utils.Optional<InspectionGroupByOutputType>[]
          }
          count: {
            args: Prisma.InspectionCountArgs<ExtArgs>
            result: $Utils.Optional<InspectionCountAggregateOutputType> | number
          }
        }
      }
      Capture: {
        payload: Prisma.$CapturePayload<ExtArgs>
        fields: Prisma.CaptureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CaptureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CaptureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          findFirst: {
            args: Prisma.CaptureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CaptureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          findMany: {
            args: Prisma.CaptureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>[]
          }
          create: {
            args: Prisma.CaptureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          createMany: {
            args: Prisma.CaptureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CaptureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>[]
          }
          delete: {
            args: Prisma.CaptureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          update: {
            args: Prisma.CaptureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          deleteMany: {
            args: Prisma.CaptureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CaptureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CaptureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>[]
          }
          upsert: {
            args: Prisma.CaptureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CapturePayload>
          }
          aggregate: {
            args: Prisma.CaptureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCapture>
          }
          groupBy: {
            args: Prisma.CaptureGroupByArgs<ExtArgs>
            result: $Utils.Optional<CaptureGroupByOutputType>[]
          }
          count: {
            args: Prisma.CaptureCountArgs<ExtArgs>
            result: $Utils.Optional<CaptureCountAggregateOutputType> | number
          }
        }
      }
      Room: {
        payload: Prisma.$RoomPayload<ExtArgs>
        fields: Prisma.RoomFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RoomFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RoomFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          findFirst: {
            args: Prisma.RoomFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RoomFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          findMany: {
            args: Prisma.RoomFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          create: {
            args: Prisma.RoomCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          createMany: {
            args: Prisma.RoomCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RoomCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          delete: {
            args: Prisma.RoomDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          update: {
            args: Prisma.RoomUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          deleteMany: {
            args: Prisma.RoomDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RoomUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RoomUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          upsert: {
            args: Prisma.RoomUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          aggregate: {
            args: Prisma.RoomAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoom>
          }
          groupBy: {
            args: Prisma.RoomGroupByArgs<ExtArgs>
            result: $Utils.Optional<RoomGroupByOutputType>[]
          }
          count: {
            args: Prisma.RoomCountArgs<ExtArgs>
            result: $Utils.Optional<RoomCountAggregateOutputType> | number
          }
        }
      }
      InspectionItem: {
        payload: Prisma.$InspectionItemPayload<ExtArgs>
        fields: Prisma.InspectionItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InspectionItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InspectionItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          findFirst: {
            args: Prisma.InspectionItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InspectionItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          findMany: {
            args: Prisma.InspectionItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>[]
          }
          create: {
            args: Prisma.InspectionItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          createMany: {
            args: Prisma.InspectionItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InspectionItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>[]
          }
          delete: {
            args: Prisma.InspectionItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          update: {
            args: Prisma.InspectionItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          deleteMany: {
            args: Prisma.InspectionItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InspectionItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InspectionItemUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>[]
          }
          upsert: {
            args: Prisma.InspectionItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InspectionItemPayload>
          }
          aggregate: {
            args: Prisma.InspectionItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInspectionItem>
          }
          groupBy: {
            args: Prisma.InspectionItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<InspectionItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.InspectionItemCountArgs<ExtArgs>
            result: $Utils.Optional<InspectionItemCountAggregateOutputType> | number
          }
        }
      }
      Finding: {
        payload: Prisma.$FindingPayload<ExtArgs>
        fields: Prisma.FindingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FindingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FindingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          findFirst: {
            args: Prisma.FindingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FindingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          findMany: {
            args: Prisma.FindingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>[]
          }
          create: {
            args: Prisma.FindingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          createMany: {
            args: Prisma.FindingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FindingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>[]
          }
          delete: {
            args: Prisma.FindingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          update: {
            args: Prisma.FindingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          deleteMany: {
            args: Prisma.FindingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FindingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FindingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>[]
          }
          upsert: {
            args: Prisma.FindingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FindingPayload>
          }
          aggregate: {
            args: Prisma.FindingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFinding>
          }
          groupBy: {
            args: Prisma.FindingGroupByArgs<ExtArgs>
            result: $Utils.Optional<FindingGroupByOutputType>[]
          }
          count: {
            args: Prisma.FindingCountArgs<ExtArgs>
            result: $Utils.Optional<FindingCountAggregateOutputType> | number
          }
        }
      }
      Signature: {
        payload: Prisma.$SignaturePayload<ExtArgs>
        fields: Prisma.SignatureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SignatureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SignatureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          findFirst: {
            args: Prisma.SignatureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SignatureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          findMany: {
            args: Prisma.SignatureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>[]
          }
          create: {
            args: Prisma.SignatureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          createMany: {
            args: Prisma.SignatureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SignatureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>[]
          }
          delete: {
            args: Prisma.SignatureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          update: {
            args: Prisma.SignatureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          deleteMany: {
            args: Prisma.SignatureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SignatureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SignatureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>[]
          }
          upsert: {
            args: Prisma.SignatureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignaturePayload>
          }
          aggregate: {
            args: Prisma.SignatureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSignature>
          }
          groupBy: {
            args: Prisma.SignatureGroupByArgs<ExtArgs>
            result: $Utils.Optional<SignatureGroupByOutputType>[]
          }
          count: {
            args: Prisma.SignatureCountArgs<ExtArgs>
            result: $Utils.Optional<SignatureCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * A driver adapter that PrismaClient uses to connect to your database, such as the ones provided by `@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale`, etc.
     * 
     * A driver adapter is **required** unless you connect to your database through Prisma Accelerate (in which case use `accelerateUrl` instead).
     * 
     * Learn more: https://pris.ly/d/driver-adapters
     * 
     * @example
     * ```ts
     * import { PrismaPg } from '@prisma/adapter-pg'
     * import { PrismaClient } from './generated/prisma/client'
     * 
     * const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
     * const prisma = new PrismaClient({ adapter })
     * ```
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * The Prisma Accelerate connection URL. Use this option to connect to your database through Prisma Accelerate instead of using a driver adapter to connect directly.
     * 
     * Learn more: https://pris.ly/d/accelerate
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    stakeholder?: StakeholderOmit
    property?: PropertyOmit
    tenancy?: TenancyOmit
    inspection?: InspectionOmit
    capture?: CaptureOmit
    room?: RoomOmit
    inspectionItem?: InspectionItemOmit
    finding?: FindingOmit
    signature?: SignatureOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type StakeholderCountOutputType
   */

  export type StakeholderCountOutputType = {
    tenanciesAsLandlord: number
    tenanciesAsTenant: number
    tenanciesAsAgent: number
    inspectionsRun: number
    signatures: number
  }

  export type StakeholderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenanciesAsLandlord?: boolean | StakeholderCountOutputTypeCountTenanciesAsLandlordArgs
    tenanciesAsTenant?: boolean | StakeholderCountOutputTypeCountTenanciesAsTenantArgs
    tenanciesAsAgent?: boolean | StakeholderCountOutputTypeCountTenanciesAsAgentArgs
    inspectionsRun?: boolean | StakeholderCountOutputTypeCountInspectionsRunArgs
    signatures?: boolean | StakeholderCountOutputTypeCountSignaturesArgs
  }

  // Custom InputTypes
  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StakeholderCountOutputType
     */
    select?: StakeholderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeCountTenanciesAsLandlordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenancyWhereInput
  }

  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeCountTenanciesAsTenantArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenancyWhereInput
  }

  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeCountTenanciesAsAgentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenancyWhereInput
  }

  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeCountInspectionsRunArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionWhereInput
  }

  /**
   * StakeholderCountOutputType without action
   */
  export type StakeholderCountOutputTypeCountSignaturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SignatureWhereInput
  }


  /**
   * Count Type PropertyCountOutputType
   */

  export type PropertyCountOutputType = {
    tenancies: number
  }

  export type PropertyCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenancies?: boolean | PropertyCountOutputTypeCountTenanciesArgs
  }

  // Custom InputTypes
  /**
   * PropertyCountOutputType without action
   */
  export type PropertyCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PropertyCountOutputType
     */
    select?: PropertyCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PropertyCountOutputType without action
   */
  export type PropertyCountOutputTypeCountTenanciesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenancyWhereInput
  }


  /**
   * Count Type TenancyCountOutputType
   */

  export type TenancyCountOutputType = {
    inspections: number
  }

  export type TenancyCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspections?: boolean | TenancyCountOutputTypeCountInspectionsArgs
  }

  // Custom InputTypes
  /**
   * TenancyCountOutputType without action
   */
  export type TenancyCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenancyCountOutputType
     */
    select?: TenancyCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TenancyCountOutputType without action
   */
  export type TenancyCountOutputTypeCountInspectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionWhereInput
  }


  /**
   * Count Type InspectionCountOutputType
   */

  export type InspectionCountOutputType = {
    rooms: number
    findings: number
    signatures: number
  }

  export type InspectionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rooms?: boolean | InspectionCountOutputTypeCountRoomsArgs
    findings?: boolean | InspectionCountOutputTypeCountFindingsArgs
    signatures?: boolean | InspectionCountOutputTypeCountSignaturesArgs
  }

  // Custom InputTypes
  /**
   * InspectionCountOutputType without action
   */
  export type InspectionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionCountOutputType
     */
    select?: InspectionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InspectionCountOutputType without action
   */
  export type InspectionCountOutputTypeCountRoomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomWhereInput
  }

  /**
   * InspectionCountOutputType without action
   */
  export type InspectionCountOutputTypeCountFindingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FindingWhereInput
  }

  /**
   * InspectionCountOutputType without action
   */
  export type InspectionCountOutputTypeCountSignaturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SignatureWhereInput
  }


  /**
   * Count Type CaptureCountOutputType
   */

  export type CaptureCountOutputType = {
    items: number
  }

  export type CaptureCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | CaptureCountOutputTypeCountItemsArgs
  }

  // Custom InputTypes
  /**
   * CaptureCountOutputType without action
   */
  export type CaptureCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CaptureCountOutputType
     */
    select?: CaptureCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CaptureCountOutputType without action
   */
  export type CaptureCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionItemWhereInput
  }


  /**
   * Count Type RoomCountOutputType
   */

  export type RoomCountOutputType = {
    captures: number
    items: number
  }

  export type RoomCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    captures?: boolean | RoomCountOutputTypeCountCapturesArgs
    items?: boolean | RoomCountOutputTypeCountItemsArgs
  }

  // Custom InputTypes
  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomCountOutputType
     */
    select?: RoomCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeCountCapturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CaptureWhereInput
  }

  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionItemWhereInput
  }


  /**
   * Count Type InspectionItemCountOutputType
   */

  export type InspectionItemCountOutputType = {
    findingsAsSubject: number
    findingsAsBaseline: number
  }

  export type InspectionItemCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    findingsAsSubject?: boolean | InspectionItemCountOutputTypeCountFindingsAsSubjectArgs
    findingsAsBaseline?: boolean | InspectionItemCountOutputTypeCountFindingsAsBaselineArgs
  }

  // Custom InputTypes
  /**
   * InspectionItemCountOutputType without action
   */
  export type InspectionItemCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItemCountOutputType
     */
    select?: InspectionItemCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InspectionItemCountOutputType without action
   */
  export type InspectionItemCountOutputTypeCountFindingsAsSubjectArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FindingWhereInput
  }

  /**
   * InspectionItemCountOutputType without action
   */
  export type InspectionItemCountOutputTypeCountFindingsAsBaselineArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FindingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Stakeholder
   */

  export type AggregateStakeholder = {
    _count: StakeholderCountAggregateOutputType | null
    _min: StakeholderMinAggregateOutputType | null
    _max: StakeholderMaxAggregateOutputType | null
  }

  export type StakeholderMinAggregateOutputType = {
    id: string | null
    kind: $Enums.StakeholderKind | null
    name: string | null
    idNumber: string | null
    email: string | null
    phone: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StakeholderMaxAggregateOutputType = {
    id: string | null
    kind: $Enums.StakeholderKind | null
    name: string | null
    idNumber: string | null
    email: string | null
    phone: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StakeholderCountAggregateOutputType = {
    id: number
    kind: number
    name: number
    idNumber: number
    email: number
    phone: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type StakeholderMinAggregateInputType = {
    id?: true
    kind?: true
    name?: true
    idNumber?: true
    email?: true
    phone?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StakeholderMaxAggregateInputType = {
    id?: true
    kind?: true
    name?: true
    idNumber?: true
    email?: true
    phone?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StakeholderCountAggregateInputType = {
    id?: true
    kind?: true
    name?: true
    idNumber?: true
    email?: true
    phone?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type StakeholderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Stakeholder to aggregate.
     */
    where?: StakeholderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Stakeholders to fetch.
     */
    orderBy?: StakeholderOrderByWithRelationInput | StakeholderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StakeholderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Stakeholders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Stakeholders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Stakeholders
    **/
    _count?: true | StakeholderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StakeholderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StakeholderMaxAggregateInputType
  }

  export type GetStakeholderAggregateType<T extends StakeholderAggregateArgs> = {
        [P in keyof T & keyof AggregateStakeholder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStakeholder[P]>
      : GetScalarType<T[P], AggregateStakeholder[P]>
  }




  export type StakeholderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StakeholderWhereInput
    orderBy?: StakeholderOrderByWithAggregationInput | StakeholderOrderByWithAggregationInput[]
    by: StakeholderScalarFieldEnum[] | StakeholderScalarFieldEnum
    having?: StakeholderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StakeholderCountAggregateInputType | true
    _min?: StakeholderMinAggregateInputType
    _max?: StakeholderMaxAggregateInputType
  }

  export type StakeholderGroupByOutputType = {
    id: string
    kind: $Enums.StakeholderKind
    name: string
    idNumber: string | null
    email: string | null
    phone: string | null
    createdAt: Date
    updatedAt: Date
    _count: StakeholderCountAggregateOutputType | null
    _min: StakeholderMinAggregateOutputType | null
    _max: StakeholderMaxAggregateOutputType | null
  }

  type GetStakeholderGroupByPayload<T extends StakeholderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StakeholderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StakeholderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StakeholderGroupByOutputType[P]>
            : GetScalarType<T[P], StakeholderGroupByOutputType[P]>
        }
      >
    >


  export type StakeholderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    name?: boolean
    idNumber?: boolean
    email?: boolean
    phone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenanciesAsLandlord?: boolean | Stakeholder$tenanciesAsLandlordArgs<ExtArgs>
    tenanciesAsTenant?: boolean | Stakeholder$tenanciesAsTenantArgs<ExtArgs>
    tenanciesAsAgent?: boolean | Stakeholder$tenanciesAsAgentArgs<ExtArgs>
    inspectionsRun?: boolean | Stakeholder$inspectionsRunArgs<ExtArgs>
    signatures?: boolean | Stakeholder$signaturesArgs<ExtArgs>
    _count?: boolean | StakeholderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["stakeholder"]>

  export type StakeholderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    name?: boolean
    idNumber?: boolean
    email?: boolean
    phone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["stakeholder"]>

  export type StakeholderSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    name?: boolean
    idNumber?: boolean
    email?: boolean
    phone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["stakeholder"]>

  export type StakeholderSelectScalar = {
    id?: boolean
    kind?: boolean
    name?: boolean
    idNumber?: boolean
    email?: boolean
    phone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type StakeholderOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "kind" | "name" | "idNumber" | "email" | "phone" | "createdAt" | "updatedAt", ExtArgs["result"]["stakeholder"]>
  export type StakeholderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenanciesAsLandlord?: boolean | Stakeholder$tenanciesAsLandlordArgs<ExtArgs>
    tenanciesAsTenant?: boolean | Stakeholder$tenanciesAsTenantArgs<ExtArgs>
    tenanciesAsAgent?: boolean | Stakeholder$tenanciesAsAgentArgs<ExtArgs>
    inspectionsRun?: boolean | Stakeholder$inspectionsRunArgs<ExtArgs>
    signatures?: boolean | Stakeholder$signaturesArgs<ExtArgs>
    _count?: boolean | StakeholderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type StakeholderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type StakeholderIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $StakeholderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Stakeholder"
    objects: {
      tenanciesAsLandlord: Prisma.$TenancyPayload<ExtArgs>[]
      tenanciesAsTenant: Prisma.$TenancyPayload<ExtArgs>[]
      tenanciesAsAgent: Prisma.$TenancyPayload<ExtArgs>[]
      inspectionsRun: Prisma.$InspectionPayload<ExtArgs>[]
      signatures: Prisma.$SignaturePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      kind: $Enums.StakeholderKind
      name: string
      idNumber: string | null
      email: string | null
      phone: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["stakeholder"]>
    composites: {}
  }

  type StakeholderGetPayload<S extends boolean | null | undefined | StakeholderDefaultArgs> = $Result.GetResult<Prisma.$StakeholderPayload, S>

  type StakeholderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StakeholderFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StakeholderCountAggregateInputType | true
    }

  export interface StakeholderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Stakeholder'], meta: { name: 'Stakeholder' } }
    /**
     * Find zero or one Stakeholder that matches the filter.
     * @param {StakeholderFindUniqueArgs} args - Arguments to find a Stakeholder
     * @example
     * // Get one Stakeholder
     * const stakeholder = await prisma.stakeholder.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StakeholderFindUniqueArgs>(args: SelectSubset<T, StakeholderFindUniqueArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Stakeholder that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StakeholderFindUniqueOrThrowArgs} args - Arguments to find a Stakeholder
     * @example
     * // Get one Stakeholder
     * const stakeholder = await prisma.stakeholder.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StakeholderFindUniqueOrThrowArgs>(args: SelectSubset<T, StakeholderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Stakeholder that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderFindFirstArgs} args - Arguments to find a Stakeholder
     * @example
     * // Get one Stakeholder
     * const stakeholder = await prisma.stakeholder.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StakeholderFindFirstArgs>(args?: SelectSubset<T, StakeholderFindFirstArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Stakeholder that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderFindFirstOrThrowArgs} args - Arguments to find a Stakeholder
     * @example
     * // Get one Stakeholder
     * const stakeholder = await prisma.stakeholder.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StakeholderFindFirstOrThrowArgs>(args?: SelectSubset<T, StakeholderFindFirstOrThrowArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Stakeholders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Stakeholders
     * const stakeholders = await prisma.stakeholder.findMany()
     * 
     * // Get first 10 Stakeholders
     * const stakeholders = await prisma.stakeholder.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const stakeholderWithIdOnly = await prisma.stakeholder.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StakeholderFindManyArgs>(args?: SelectSubset<T, StakeholderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Stakeholder.
     * @param {StakeholderCreateArgs} args - Arguments to create a Stakeholder.
     * @example
     * // Create one Stakeholder
     * const Stakeholder = await prisma.stakeholder.create({
     *   data: {
     *     // ... data to create a Stakeholder
     *   }
     * })
     * 
     */
    create<T extends StakeholderCreateArgs>(args: SelectSubset<T, StakeholderCreateArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Stakeholders.
     * @param {StakeholderCreateManyArgs} args - Arguments to create many Stakeholders.
     * @example
     * // Create many Stakeholders
     * const stakeholder = await prisma.stakeholder.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StakeholderCreateManyArgs>(args?: SelectSubset<T, StakeholderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Stakeholders and returns the data saved in the database.
     * @param {StakeholderCreateManyAndReturnArgs} args - Arguments to create many Stakeholders.
     * @example
     * // Create many Stakeholders
     * const stakeholder = await prisma.stakeholder.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Stakeholders and only return the `id`
     * const stakeholderWithIdOnly = await prisma.stakeholder.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StakeholderCreateManyAndReturnArgs>(args?: SelectSubset<T, StakeholderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Stakeholder.
     * @param {StakeholderDeleteArgs} args - Arguments to delete one Stakeholder.
     * @example
     * // Delete one Stakeholder
     * const Stakeholder = await prisma.stakeholder.delete({
     *   where: {
     *     // ... filter to delete one Stakeholder
     *   }
     * })
     * 
     */
    delete<T extends StakeholderDeleteArgs>(args: SelectSubset<T, StakeholderDeleteArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Stakeholder.
     * @param {StakeholderUpdateArgs} args - Arguments to update one Stakeholder.
     * @example
     * // Update one Stakeholder
     * const stakeholder = await prisma.stakeholder.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StakeholderUpdateArgs>(args: SelectSubset<T, StakeholderUpdateArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Stakeholders.
     * @param {StakeholderDeleteManyArgs} args - Arguments to filter Stakeholders to delete.
     * @example
     * // Delete a few Stakeholders
     * const { count } = await prisma.stakeholder.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StakeholderDeleteManyArgs>(args?: SelectSubset<T, StakeholderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Stakeholders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Stakeholders
     * const stakeholder = await prisma.stakeholder.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StakeholderUpdateManyArgs>(args: SelectSubset<T, StakeholderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Stakeholders and returns the data updated in the database.
     * @param {StakeholderUpdateManyAndReturnArgs} args - Arguments to update many Stakeholders.
     * @example
     * // Update many Stakeholders
     * const stakeholder = await prisma.stakeholder.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Stakeholders and only return the `id`
     * const stakeholderWithIdOnly = await prisma.stakeholder.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StakeholderUpdateManyAndReturnArgs>(args: SelectSubset<T, StakeholderUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Stakeholder.
     * @param {StakeholderUpsertArgs} args - Arguments to update or create a Stakeholder.
     * @example
     * // Update or create a Stakeholder
     * const stakeholder = await prisma.stakeholder.upsert({
     *   create: {
     *     // ... data to create a Stakeholder
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Stakeholder we want to update
     *   }
     * })
     */
    upsert<T extends StakeholderUpsertArgs>(args: SelectSubset<T, StakeholderUpsertArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Stakeholders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderCountArgs} args - Arguments to filter Stakeholders to count.
     * @example
     * // Count the number of Stakeholders
     * const count = await prisma.stakeholder.count({
     *   where: {
     *     // ... the filter for the Stakeholders we want to count
     *   }
     * })
    **/
    count<T extends StakeholderCountArgs>(
      args?: Subset<T, StakeholderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StakeholderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Stakeholder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StakeholderAggregateArgs>(args: Subset<T, StakeholderAggregateArgs>): Prisma.PrismaPromise<GetStakeholderAggregateType<T>>

    /**
     * Group by Stakeholder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StakeholderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StakeholderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StakeholderGroupByArgs['orderBy'] }
        : { orderBy?: StakeholderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StakeholderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStakeholderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Stakeholder model
   */
  readonly fields: StakeholderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Stakeholder.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StakeholderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenanciesAsLandlord<T extends Stakeholder$tenanciesAsLandlordArgs<ExtArgs> = {}>(args?: Subset<T, Stakeholder$tenanciesAsLandlordArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tenanciesAsTenant<T extends Stakeholder$tenanciesAsTenantArgs<ExtArgs> = {}>(args?: Subset<T, Stakeholder$tenanciesAsTenantArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tenanciesAsAgent<T extends Stakeholder$tenanciesAsAgentArgs<ExtArgs> = {}>(args?: Subset<T, Stakeholder$tenanciesAsAgentArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    inspectionsRun<T extends Stakeholder$inspectionsRunArgs<ExtArgs> = {}>(args?: Subset<T, Stakeholder$inspectionsRunArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    signatures<T extends Stakeholder$signaturesArgs<ExtArgs> = {}>(args?: Subset<T, Stakeholder$signaturesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Stakeholder model
   */
  interface StakeholderFieldRefs {
    readonly id: FieldRef<"Stakeholder", 'String'>
    readonly kind: FieldRef<"Stakeholder", 'StakeholderKind'>
    readonly name: FieldRef<"Stakeholder", 'String'>
    readonly idNumber: FieldRef<"Stakeholder", 'String'>
    readonly email: FieldRef<"Stakeholder", 'String'>
    readonly phone: FieldRef<"Stakeholder", 'String'>
    readonly createdAt: FieldRef<"Stakeholder", 'DateTime'>
    readonly updatedAt: FieldRef<"Stakeholder", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Stakeholder findUnique
   */
  export type StakeholderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter, which Stakeholder to fetch.
     */
    where: StakeholderWhereUniqueInput
  }

  /**
   * Stakeholder findUniqueOrThrow
   */
  export type StakeholderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter, which Stakeholder to fetch.
     */
    where: StakeholderWhereUniqueInput
  }

  /**
   * Stakeholder findFirst
   */
  export type StakeholderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter, which Stakeholder to fetch.
     */
    where?: StakeholderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Stakeholders to fetch.
     */
    orderBy?: StakeholderOrderByWithRelationInput | StakeholderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Stakeholders.
     */
    cursor?: StakeholderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Stakeholders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Stakeholders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Stakeholders.
     */
    distinct?: StakeholderScalarFieldEnum | StakeholderScalarFieldEnum[]
  }

  /**
   * Stakeholder findFirstOrThrow
   */
  export type StakeholderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter, which Stakeholder to fetch.
     */
    where?: StakeholderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Stakeholders to fetch.
     */
    orderBy?: StakeholderOrderByWithRelationInput | StakeholderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Stakeholders.
     */
    cursor?: StakeholderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Stakeholders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Stakeholders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Stakeholders.
     */
    distinct?: StakeholderScalarFieldEnum | StakeholderScalarFieldEnum[]
  }

  /**
   * Stakeholder findMany
   */
  export type StakeholderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter, which Stakeholders to fetch.
     */
    where?: StakeholderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Stakeholders to fetch.
     */
    orderBy?: StakeholderOrderByWithRelationInput | StakeholderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Stakeholders.
     */
    cursor?: StakeholderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Stakeholders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Stakeholders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Stakeholders.
     */
    distinct?: StakeholderScalarFieldEnum | StakeholderScalarFieldEnum[]
  }

  /**
   * Stakeholder create
   */
  export type StakeholderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * The data needed to create a Stakeholder.
     */
    data: XOR<StakeholderCreateInput, StakeholderUncheckedCreateInput>
  }

  /**
   * Stakeholder createMany
   */
  export type StakeholderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Stakeholders.
     */
    data: StakeholderCreateManyInput | StakeholderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Stakeholder createManyAndReturn
   */
  export type StakeholderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * The data used to create many Stakeholders.
     */
    data: StakeholderCreateManyInput | StakeholderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Stakeholder update
   */
  export type StakeholderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * The data needed to update a Stakeholder.
     */
    data: XOR<StakeholderUpdateInput, StakeholderUncheckedUpdateInput>
    /**
     * Choose, which Stakeholder to update.
     */
    where: StakeholderWhereUniqueInput
  }

  /**
   * Stakeholder updateMany
   */
  export type StakeholderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Stakeholders.
     */
    data: XOR<StakeholderUpdateManyMutationInput, StakeholderUncheckedUpdateManyInput>
    /**
     * Filter which Stakeholders to update
     */
    where?: StakeholderWhereInput
    /**
     * Limit how many Stakeholders to update.
     */
    limit?: number
  }

  /**
   * Stakeholder updateManyAndReturn
   */
  export type StakeholderUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * The data used to update Stakeholders.
     */
    data: XOR<StakeholderUpdateManyMutationInput, StakeholderUncheckedUpdateManyInput>
    /**
     * Filter which Stakeholders to update
     */
    where?: StakeholderWhereInput
    /**
     * Limit how many Stakeholders to update.
     */
    limit?: number
  }

  /**
   * Stakeholder upsert
   */
  export type StakeholderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * The filter to search for the Stakeholder to update in case it exists.
     */
    where: StakeholderWhereUniqueInput
    /**
     * In case the Stakeholder found by the `where` argument doesn't exist, create a new Stakeholder with this data.
     */
    create: XOR<StakeholderCreateInput, StakeholderUncheckedCreateInput>
    /**
     * In case the Stakeholder was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StakeholderUpdateInput, StakeholderUncheckedUpdateInput>
  }

  /**
   * Stakeholder delete
   */
  export type StakeholderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    /**
     * Filter which Stakeholder to delete.
     */
    where: StakeholderWhereUniqueInput
  }

  /**
   * Stakeholder deleteMany
   */
  export type StakeholderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Stakeholders to delete
     */
    where?: StakeholderWhereInput
    /**
     * Limit how many Stakeholders to delete.
     */
    limit?: number
  }

  /**
   * Stakeholder.tenanciesAsLandlord
   */
  export type Stakeholder$tenanciesAsLandlordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    where?: TenancyWhereInput
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    cursor?: TenancyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Stakeholder.tenanciesAsTenant
   */
  export type Stakeholder$tenanciesAsTenantArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    where?: TenancyWhereInput
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    cursor?: TenancyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Stakeholder.tenanciesAsAgent
   */
  export type Stakeholder$tenanciesAsAgentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    where?: TenancyWhereInput
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    cursor?: TenancyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Stakeholder.inspectionsRun
   */
  export type Stakeholder$inspectionsRunArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    where?: InspectionWhereInput
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    cursor?: InspectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InspectionScalarFieldEnum | InspectionScalarFieldEnum[]
  }

  /**
   * Stakeholder.signatures
   */
  export type Stakeholder$signaturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    where?: SignatureWhereInput
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    cursor?: SignatureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SignatureScalarFieldEnum | SignatureScalarFieldEnum[]
  }

  /**
   * Stakeholder without action
   */
  export type StakeholderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
  }


  /**
   * Model Property
   */

  export type AggregateProperty = {
    _count: PropertyCountAggregateOutputType | null
    _min: PropertyMinAggregateOutputType | null
    _max: PropertyMaxAggregateOutputType | null
  }

  export type PropertyMinAggregateOutputType = {
    id: string | null
    line1: string | null
    unit: string | null
    postalCode: string | null
    type: $Enums.PropertyType | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PropertyMaxAggregateOutputType = {
    id: string | null
    line1: string | null
    unit: string | null
    postalCode: string | null
    type: $Enums.PropertyType | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PropertyCountAggregateOutputType = {
    id: number
    line1: number
    unit: number
    postalCode: number
    type: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PropertyMinAggregateInputType = {
    id?: true
    line1?: true
    unit?: true
    postalCode?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PropertyMaxAggregateInputType = {
    id?: true
    line1?: true
    unit?: true
    postalCode?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PropertyCountAggregateInputType = {
    id?: true
    line1?: true
    unit?: true
    postalCode?: true
    type?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PropertyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Property to aggregate.
     */
    where?: PropertyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Properties to fetch.
     */
    orderBy?: PropertyOrderByWithRelationInput | PropertyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PropertyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Properties from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Properties.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Properties
    **/
    _count?: true | PropertyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PropertyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PropertyMaxAggregateInputType
  }

  export type GetPropertyAggregateType<T extends PropertyAggregateArgs> = {
        [P in keyof T & keyof AggregateProperty]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProperty[P]>
      : GetScalarType<T[P], AggregateProperty[P]>
  }




  export type PropertyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PropertyWhereInput
    orderBy?: PropertyOrderByWithAggregationInput | PropertyOrderByWithAggregationInput[]
    by: PropertyScalarFieldEnum[] | PropertyScalarFieldEnum
    having?: PropertyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PropertyCountAggregateInputType | true
    _min?: PropertyMinAggregateInputType
    _max?: PropertyMaxAggregateInputType
  }

  export type PropertyGroupByOutputType = {
    id: string
    line1: string
    unit: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt: Date
    updatedAt: Date
    _count: PropertyCountAggregateOutputType | null
    _min: PropertyMinAggregateOutputType | null
    _max: PropertyMaxAggregateOutputType | null
  }

  type GetPropertyGroupByPayload<T extends PropertyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PropertyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PropertyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PropertyGroupByOutputType[P]>
            : GetScalarType<T[P], PropertyGroupByOutputType[P]>
        }
      >
    >


  export type PropertySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    line1?: boolean
    unit?: boolean
    postalCode?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenancies?: boolean | Property$tenanciesArgs<ExtArgs>
    _count?: boolean | PropertyCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["property"]>

  export type PropertySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    line1?: boolean
    unit?: boolean
    postalCode?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["property"]>

  export type PropertySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    line1?: boolean
    unit?: boolean
    postalCode?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["property"]>

  export type PropertySelectScalar = {
    id?: boolean
    line1?: boolean
    unit?: boolean
    postalCode?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PropertyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "line1" | "unit" | "postalCode" | "type" | "createdAt" | "updatedAt", ExtArgs["result"]["property"]>
  export type PropertyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenancies?: boolean | Property$tenanciesArgs<ExtArgs>
    _count?: boolean | PropertyCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PropertyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type PropertyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $PropertyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Property"
    objects: {
      tenancies: Prisma.$TenancyPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      line1: string
      unit: string | null
      postalCode: string
      type: $Enums.PropertyType
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["property"]>
    composites: {}
  }

  type PropertyGetPayload<S extends boolean | null | undefined | PropertyDefaultArgs> = $Result.GetResult<Prisma.$PropertyPayload, S>

  type PropertyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PropertyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PropertyCountAggregateInputType | true
    }

  export interface PropertyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Property'], meta: { name: 'Property' } }
    /**
     * Find zero or one Property that matches the filter.
     * @param {PropertyFindUniqueArgs} args - Arguments to find a Property
     * @example
     * // Get one Property
     * const property = await prisma.property.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PropertyFindUniqueArgs>(args: SelectSubset<T, PropertyFindUniqueArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Property that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PropertyFindUniqueOrThrowArgs} args - Arguments to find a Property
     * @example
     * // Get one Property
     * const property = await prisma.property.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PropertyFindUniqueOrThrowArgs>(args: SelectSubset<T, PropertyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Property that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyFindFirstArgs} args - Arguments to find a Property
     * @example
     * // Get one Property
     * const property = await prisma.property.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PropertyFindFirstArgs>(args?: SelectSubset<T, PropertyFindFirstArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Property that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyFindFirstOrThrowArgs} args - Arguments to find a Property
     * @example
     * // Get one Property
     * const property = await prisma.property.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PropertyFindFirstOrThrowArgs>(args?: SelectSubset<T, PropertyFindFirstOrThrowArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Properties that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Properties
     * const properties = await prisma.property.findMany()
     * 
     * // Get first 10 Properties
     * const properties = await prisma.property.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const propertyWithIdOnly = await prisma.property.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PropertyFindManyArgs>(args?: SelectSubset<T, PropertyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Property.
     * @param {PropertyCreateArgs} args - Arguments to create a Property.
     * @example
     * // Create one Property
     * const Property = await prisma.property.create({
     *   data: {
     *     // ... data to create a Property
     *   }
     * })
     * 
     */
    create<T extends PropertyCreateArgs>(args: SelectSubset<T, PropertyCreateArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Properties.
     * @param {PropertyCreateManyArgs} args - Arguments to create many Properties.
     * @example
     * // Create many Properties
     * const property = await prisma.property.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PropertyCreateManyArgs>(args?: SelectSubset<T, PropertyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Properties and returns the data saved in the database.
     * @param {PropertyCreateManyAndReturnArgs} args - Arguments to create many Properties.
     * @example
     * // Create many Properties
     * const property = await prisma.property.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Properties and only return the `id`
     * const propertyWithIdOnly = await prisma.property.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PropertyCreateManyAndReturnArgs>(args?: SelectSubset<T, PropertyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Property.
     * @param {PropertyDeleteArgs} args - Arguments to delete one Property.
     * @example
     * // Delete one Property
     * const Property = await prisma.property.delete({
     *   where: {
     *     // ... filter to delete one Property
     *   }
     * })
     * 
     */
    delete<T extends PropertyDeleteArgs>(args: SelectSubset<T, PropertyDeleteArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Property.
     * @param {PropertyUpdateArgs} args - Arguments to update one Property.
     * @example
     * // Update one Property
     * const property = await prisma.property.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PropertyUpdateArgs>(args: SelectSubset<T, PropertyUpdateArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Properties.
     * @param {PropertyDeleteManyArgs} args - Arguments to filter Properties to delete.
     * @example
     * // Delete a few Properties
     * const { count } = await prisma.property.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PropertyDeleteManyArgs>(args?: SelectSubset<T, PropertyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Properties.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Properties
     * const property = await prisma.property.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PropertyUpdateManyArgs>(args: SelectSubset<T, PropertyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Properties and returns the data updated in the database.
     * @param {PropertyUpdateManyAndReturnArgs} args - Arguments to update many Properties.
     * @example
     * // Update many Properties
     * const property = await prisma.property.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Properties and only return the `id`
     * const propertyWithIdOnly = await prisma.property.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PropertyUpdateManyAndReturnArgs>(args: SelectSubset<T, PropertyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Property.
     * @param {PropertyUpsertArgs} args - Arguments to update or create a Property.
     * @example
     * // Update or create a Property
     * const property = await prisma.property.upsert({
     *   create: {
     *     // ... data to create a Property
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Property we want to update
     *   }
     * })
     */
    upsert<T extends PropertyUpsertArgs>(args: SelectSubset<T, PropertyUpsertArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Properties.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyCountArgs} args - Arguments to filter Properties to count.
     * @example
     * // Count the number of Properties
     * const count = await prisma.property.count({
     *   where: {
     *     // ... the filter for the Properties we want to count
     *   }
     * })
    **/
    count<T extends PropertyCountArgs>(
      args?: Subset<T, PropertyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PropertyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Property.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PropertyAggregateArgs>(args: Subset<T, PropertyAggregateArgs>): Prisma.PrismaPromise<GetPropertyAggregateType<T>>

    /**
     * Group by Property.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PropertyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PropertyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PropertyGroupByArgs['orderBy'] }
        : { orderBy?: PropertyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PropertyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPropertyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Property model
   */
  readonly fields: PropertyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Property.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PropertyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenancies<T extends Property$tenanciesArgs<ExtArgs> = {}>(args?: Subset<T, Property$tenanciesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Property model
   */
  interface PropertyFieldRefs {
    readonly id: FieldRef<"Property", 'String'>
    readonly line1: FieldRef<"Property", 'String'>
    readonly unit: FieldRef<"Property", 'String'>
    readonly postalCode: FieldRef<"Property", 'String'>
    readonly type: FieldRef<"Property", 'PropertyType'>
    readonly createdAt: FieldRef<"Property", 'DateTime'>
    readonly updatedAt: FieldRef<"Property", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Property findUnique
   */
  export type PropertyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter, which Property to fetch.
     */
    where: PropertyWhereUniqueInput
  }

  /**
   * Property findUniqueOrThrow
   */
  export type PropertyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter, which Property to fetch.
     */
    where: PropertyWhereUniqueInput
  }

  /**
   * Property findFirst
   */
  export type PropertyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter, which Property to fetch.
     */
    where?: PropertyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Properties to fetch.
     */
    orderBy?: PropertyOrderByWithRelationInput | PropertyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Properties.
     */
    cursor?: PropertyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Properties from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Properties.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Properties.
     */
    distinct?: PropertyScalarFieldEnum | PropertyScalarFieldEnum[]
  }

  /**
   * Property findFirstOrThrow
   */
  export type PropertyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter, which Property to fetch.
     */
    where?: PropertyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Properties to fetch.
     */
    orderBy?: PropertyOrderByWithRelationInput | PropertyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Properties.
     */
    cursor?: PropertyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Properties from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Properties.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Properties.
     */
    distinct?: PropertyScalarFieldEnum | PropertyScalarFieldEnum[]
  }

  /**
   * Property findMany
   */
  export type PropertyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter, which Properties to fetch.
     */
    where?: PropertyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Properties to fetch.
     */
    orderBy?: PropertyOrderByWithRelationInput | PropertyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Properties.
     */
    cursor?: PropertyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Properties from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Properties.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Properties.
     */
    distinct?: PropertyScalarFieldEnum | PropertyScalarFieldEnum[]
  }

  /**
   * Property create
   */
  export type PropertyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * The data needed to create a Property.
     */
    data: XOR<PropertyCreateInput, PropertyUncheckedCreateInput>
  }

  /**
   * Property createMany
   */
  export type PropertyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Properties.
     */
    data: PropertyCreateManyInput | PropertyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Property createManyAndReturn
   */
  export type PropertyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * The data used to create many Properties.
     */
    data: PropertyCreateManyInput | PropertyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Property update
   */
  export type PropertyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * The data needed to update a Property.
     */
    data: XOR<PropertyUpdateInput, PropertyUncheckedUpdateInput>
    /**
     * Choose, which Property to update.
     */
    where: PropertyWhereUniqueInput
  }

  /**
   * Property updateMany
   */
  export type PropertyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Properties.
     */
    data: XOR<PropertyUpdateManyMutationInput, PropertyUncheckedUpdateManyInput>
    /**
     * Filter which Properties to update
     */
    where?: PropertyWhereInput
    /**
     * Limit how many Properties to update.
     */
    limit?: number
  }

  /**
   * Property updateManyAndReturn
   */
  export type PropertyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * The data used to update Properties.
     */
    data: XOR<PropertyUpdateManyMutationInput, PropertyUncheckedUpdateManyInput>
    /**
     * Filter which Properties to update
     */
    where?: PropertyWhereInput
    /**
     * Limit how many Properties to update.
     */
    limit?: number
  }

  /**
   * Property upsert
   */
  export type PropertyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * The filter to search for the Property to update in case it exists.
     */
    where: PropertyWhereUniqueInput
    /**
     * In case the Property found by the `where` argument doesn't exist, create a new Property with this data.
     */
    create: XOR<PropertyCreateInput, PropertyUncheckedCreateInput>
    /**
     * In case the Property was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PropertyUpdateInput, PropertyUncheckedUpdateInput>
  }

  /**
   * Property delete
   */
  export type PropertyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
    /**
     * Filter which Property to delete.
     */
    where: PropertyWhereUniqueInput
  }

  /**
   * Property deleteMany
   */
  export type PropertyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Properties to delete
     */
    where?: PropertyWhereInput
    /**
     * Limit how many Properties to delete.
     */
    limit?: number
  }

  /**
   * Property.tenancies
   */
  export type Property$tenanciesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    where?: TenancyWhereInput
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    cursor?: TenancyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Property without action
   */
  export type PropertyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Property
     */
    select?: PropertySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Property
     */
    omit?: PropertyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PropertyInclude<ExtArgs> | null
  }


  /**
   * Model Tenancy
   */

  export type AggregateTenancy = {
    _count: TenancyCountAggregateOutputType | null
    _avg: TenancyAvgAggregateOutputType | null
    _sum: TenancySumAggregateOutputType | null
    _min: TenancyMinAggregateOutputType | null
    _max: TenancyMaxAggregateOutputType | null
  }

  export type TenancyAvgAggregateOutputType = {
    monthlyRent: Decimal | null
    deposit: Decimal | null
  }

  export type TenancySumAggregateOutputType = {
    monthlyRent: Decimal | null
    deposit: Decimal | null
  }

  export type TenancyMinAggregateOutputType = {
    id: string | null
    propertyId: string | null
    landlordId: string | null
    tenantId: string | null
    agentId: string | null
    startDate: Date | null
    endDate: Date | null
    monthlyRent: Decimal | null
    deposit: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenancyMaxAggregateOutputType = {
    id: string | null
    propertyId: string | null
    landlordId: string | null
    tenantId: string | null
    agentId: string | null
    startDate: Date | null
    endDate: Date | null
    monthlyRent: Decimal | null
    deposit: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenancyCountAggregateOutputType = {
    id: number
    propertyId: number
    landlordId: number
    tenantId: number
    agentId: number
    startDate: number
    endDate: number
    monthlyRent: number
    deposit: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TenancyAvgAggregateInputType = {
    monthlyRent?: true
    deposit?: true
  }

  export type TenancySumAggregateInputType = {
    monthlyRent?: true
    deposit?: true
  }

  export type TenancyMinAggregateInputType = {
    id?: true
    propertyId?: true
    landlordId?: true
    tenantId?: true
    agentId?: true
    startDate?: true
    endDate?: true
    monthlyRent?: true
    deposit?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenancyMaxAggregateInputType = {
    id?: true
    propertyId?: true
    landlordId?: true
    tenantId?: true
    agentId?: true
    startDate?: true
    endDate?: true
    monthlyRent?: true
    deposit?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenancyCountAggregateInputType = {
    id?: true
    propertyId?: true
    landlordId?: true
    tenantId?: true
    agentId?: true
    startDate?: true
    endDate?: true
    monthlyRent?: true
    deposit?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TenancyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tenancy to aggregate.
     */
    where?: TenancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenancies to fetch.
     */
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tenancies
    **/
    _count?: true | TenancyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TenancyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TenancySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenancyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenancyMaxAggregateInputType
  }

  export type GetTenancyAggregateType<T extends TenancyAggregateArgs> = {
        [P in keyof T & keyof AggregateTenancy]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenancy[P]>
      : GetScalarType<T[P], AggregateTenancy[P]>
  }




  export type TenancyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenancyWhereInput
    orderBy?: TenancyOrderByWithAggregationInput | TenancyOrderByWithAggregationInput[]
    by: TenancyScalarFieldEnum[] | TenancyScalarFieldEnum
    having?: TenancyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenancyCountAggregateInputType | true
    _avg?: TenancyAvgAggregateInputType
    _sum?: TenancySumAggregateInputType
    _min?: TenancyMinAggregateInputType
    _max?: TenancyMaxAggregateInputType
  }

  export type TenancyGroupByOutputType = {
    id: string
    propertyId: string
    landlordId: string
    tenantId: string
    agentId: string | null
    startDate: Date
    endDate: Date
    monthlyRent: Decimal
    deposit: Decimal
    createdAt: Date
    updatedAt: Date
    _count: TenancyCountAggregateOutputType | null
    _avg: TenancyAvgAggregateOutputType | null
    _sum: TenancySumAggregateOutputType | null
    _min: TenancyMinAggregateOutputType | null
    _max: TenancyMaxAggregateOutputType | null
  }

  type GetTenancyGroupByPayload<T extends TenancyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenancyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenancyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenancyGroupByOutputType[P]>
            : GetScalarType<T[P], TenancyGroupByOutputType[P]>
        }
      >
    >


  export type TenancySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    propertyId?: boolean
    landlordId?: boolean
    tenantId?: boolean
    agentId?: boolean
    startDate?: boolean
    endDate?: boolean
    monthlyRent?: boolean
    deposit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
    inspections?: boolean | Tenancy$inspectionsArgs<ExtArgs>
    _count?: boolean | TenancyCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenancy"]>

  export type TenancySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    propertyId?: boolean
    landlordId?: boolean
    tenantId?: boolean
    agentId?: boolean
    startDate?: boolean
    endDate?: boolean
    monthlyRent?: boolean
    deposit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
  }, ExtArgs["result"]["tenancy"]>

  export type TenancySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    propertyId?: boolean
    landlordId?: boolean
    tenantId?: boolean
    agentId?: boolean
    startDate?: boolean
    endDate?: boolean
    monthlyRent?: boolean
    deposit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
  }, ExtArgs["result"]["tenancy"]>

  export type TenancySelectScalar = {
    id?: boolean
    propertyId?: boolean
    landlordId?: boolean
    tenantId?: boolean
    agentId?: boolean
    startDate?: boolean
    endDate?: boolean
    monthlyRent?: boolean
    deposit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TenancyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "propertyId" | "landlordId" | "tenantId" | "agentId" | "startDate" | "endDate" | "monthlyRent" | "deposit" | "createdAt" | "updatedAt", ExtArgs["result"]["tenancy"]>
  export type TenancyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
    inspections?: boolean | Tenancy$inspectionsArgs<ExtArgs>
    _count?: boolean | TenancyCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TenancyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
  }
  export type TenancyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    property?: boolean | PropertyDefaultArgs<ExtArgs>
    landlord?: boolean | StakeholderDefaultArgs<ExtArgs>
    tenant?: boolean | StakeholderDefaultArgs<ExtArgs>
    agent?: boolean | Tenancy$agentArgs<ExtArgs>
  }

  export type $TenancyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Tenancy"
    objects: {
      property: Prisma.$PropertyPayload<ExtArgs>
      landlord: Prisma.$StakeholderPayload<ExtArgs>
      tenant: Prisma.$StakeholderPayload<ExtArgs>
      agent: Prisma.$StakeholderPayload<ExtArgs> | null
      inspections: Prisma.$InspectionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      propertyId: string
      landlordId: string
      tenantId: string
      agentId: string | null
      startDate: Date
      endDate: Date
      monthlyRent: Prisma.Decimal
      deposit: Prisma.Decimal
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tenancy"]>
    composites: {}
  }

  type TenancyGetPayload<S extends boolean | null | undefined | TenancyDefaultArgs> = $Result.GetResult<Prisma.$TenancyPayload, S>

  type TenancyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenancyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenancyCountAggregateInputType | true
    }

  export interface TenancyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Tenancy'], meta: { name: 'Tenancy' } }
    /**
     * Find zero or one Tenancy that matches the filter.
     * @param {TenancyFindUniqueArgs} args - Arguments to find a Tenancy
     * @example
     * // Get one Tenancy
     * const tenancy = await prisma.tenancy.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenancyFindUniqueArgs>(args: SelectSubset<T, TenancyFindUniqueArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Tenancy that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenancyFindUniqueOrThrowArgs} args - Arguments to find a Tenancy
     * @example
     * // Get one Tenancy
     * const tenancy = await prisma.tenancy.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenancyFindUniqueOrThrowArgs>(args: SelectSubset<T, TenancyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tenancy that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyFindFirstArgs} args - Arguments to find a Tenancy
     * @example
     * // Get one Tenancy
     * const tenancy = await prisma.tenancy.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenancyFindFirstArgs>(args?: SelectSubset<T, TenancyFindFirstArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tenancy that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyFindFirstOrThrowArgs} args - Arguments to find a Tenancy
     * @example
     * // Get one Tenancy
     * const tenancy = await prisma.tenancy.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenancyFindFirstOrThrowArgs>(args?: SelectSubset<T, TenancyFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tenancies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tenancies
     * const tenancies = await prisma.tenancy.findMany()
     * 
     * // Get first 10 Tenancies
     * const tenancies = await prisma.tenancy.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tenancyWithIdOnly = await prisma.tenancy.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TenancyFindManyArgs>(args?: SelectSubset<T, TenancyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Tenancy.
     * @param {TenancyCreateArgs} args - Arguments to create a Tenancy.
     * @example
     * // Create one Tenancy
     * const Tenancy = await prisma.tenancy.create({
     *   data: {
     *     // ... data to create a Tenancy
     *   }
     * })
     * 
     */
    create<T extends TenancyCreateArgs>(args: SelectSubset<T, TenancyCreateArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tenancies.
     * @param {TenancyCreateManyArgs} args - Arguments to create many Tenancies.
     * @example
     * // Create many Tenancies
     * const tenancy = await prisma.tenancy.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenancyCreateManyArgs>(args?: SelectSubset<T, TenancyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tenancies and returns the data saved in the database.
     * @param {TenancyCreateManyAndReturnArgs} args - Arguments to create many Tenancies.
     * @example
     * // Create many Tenancies
     * const tenancy = await prisma.tenancy.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tenancies and only return the `id`
     * const tenancyWithIdOnly = await prisma.tenancy.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenancyCreateManyAndReturnArgs>(args?: SelectSubset<T, TenancyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Tenancy.
     * @param {TenancyDeleteArgs} args - Arguments to delete one Tenancy.
     * @example
     * // Delete one Tenancy
     * const Tenancy = await prisma.tenancy.delete({
     *   where: {
     *     // ... filter to delete one Tenancy
     *   }
     * })
     * 
     */
    delete<T extends TenancyDeleteArgs>(args: SelectSubset<T, TenancyDeleteArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Tenancy.
     * @param {TenancyUpdateArgs} args - Arguments to update one Tenancy.
     * @example
     * // Update one Tenancy
     * const tenancy = await prisma.tenancy.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenancyUpdateArgs>(args: SelectSubset<T, TenancyUpdateArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tenancies.
     * @param {TenancyDeleteManyArgs} args - Arguments to filter Tenancies to delete.
     * @example
     * // Delete a few Tenancies
     * const { count } = await prisma.tenancy.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenancyDeleteManyArgs>(args?: SelectSubset<T, TenancyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tenancies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tenancies
     * const tenancy = await prisma.tenancy.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenancyUpdateManyArgs>(args: SelectSubset<T, TenancyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tenancies and returns the data updated in the database.
     * @param {TenancyUpdateManyAndReturnArgs} args - Arguments to update many Tenancies.
     * @example
     * // Update many Tenancies
     * const tenancy = await prisma.tenancy.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tenancies and only return the `id`
     * const tenancyWithIdOnly = await prisma.tenancy.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TenancyUpdateManyAndReturnArgs>(args: SelectSubset<T, TenancyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Tenancy.
     * @param {TenancyUpsertArgs} args - Arguments to update or create a Tenancy.
     * @example
     * // Update or create a Tenancy
     * const tenancy = await prisma.tenancy.upsert({
     *   create: {
     *     // ... data to create a Tenancy
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tenancy we want to update
     *   }
     * })
     */
    upsert<T extends TenancyUpsertArgs>(args: SelectSubset<T, TenancyUpsertArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tenancies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyCountArgs} args - Arguments to filter Tenancies to count.
     * @example
     * // Count the number of Tenancies
     * const count = await prisma.tenancy.count({
     *   where: {
     *     // ... the filter for the Tenancies we want to count
     *   }
     * })
    **/
    count<T extends TenancyCountArgs>(
      args?: Subset<T, TenancyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenancyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Tenancy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TenancyAggregateArgs>(args: Subset<T, TenancyAggregateArgs>): Prisma.PrismaPromise<GetTenancyAggregateType<T>>

    /**
     * Group by Tenancy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenancyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TenancyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenancyGroupByArgs['orderBy'] }
        : { orderBy?: TenancyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TenancyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenancyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Tenancy model
   */
  readonly fields: TenancyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Tenancy.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenancyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    property<T extends PropertyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PropertyDefaultArgs<ExtArgs>>): Prisma__PropertyClient<$Result.GetResult<Prisma.$PropertyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    landlord<T extends StakeholderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StakeholderDefaultArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tenant<T extends StakeholderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StakeholderDefaultArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    agent<T extends Tenancy$agentArgs<ExtArgs> = {}>(args?: Subset<T, Tenancy$agentArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    inspections<T extends Tenancy$inspectionsArgs<ExtArgs> = {}>(args?: Subset<T, Tenancy$inspectionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Tenancy model
   */
  interface TenancyFieldRefs {
    readonly id: FieldRef<"Tenancy", 'String'>
    readonly propertyId: FieldRef<"Tenancy", 'String'>
    readonly landlordId: FieldRef<"Tenancy", 'String'>
    readonly tenantId: FieldRef<"Tenancy", 'String'>
    readonly agentId: FieldRef<"Tenancy", 'String'>
    readonly startDate: FieldRef<"Tenancy", 'DateTime'>
    readonly endDate: FieldRef<"Tenancy", 'DateTime'>
    readonly monthlyRent: FieldRef<"Tenancy", 'Decimal'>
    readonly deposit: FieldRef<"Tenancy", 'Decimal'>
    readonly createdAt: FieldRef<"Tenancy", 'DateTime'>
    readonly updatedAt: FieldRef<"Tenancy", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Tenancy findUnique
   */
  export type TenancyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter, which Tenancy to fetch.
     */
    where: TenancyWhereUniqueInput
  }

  /**
   * Tenancy findUniqueOrThrow
   */
  export type TenancyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter, which Tenancy to fetch.
     */
    where: TenancyWhereUniqueInput
  }

  /**
   * Tenancy findFirst
   */
  export type TenancyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter, which Tenancy to fetch.
     */
    where?: TenancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenancies to fetch.
     */
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tenancies.
     */
    cursor?: TenancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tenancies.
     */
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Tenancy findFirstOrThrow
   */
  export type TenancyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter, which Tenancy to fetch.
     */
    where?: TenancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenancies to fetch.
     */
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tenancies.
     */
    cursor?: TenancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tenancies.
     */
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Tenancy findMany
   */
  export type TenancyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter, which Tenancies to fetch.
     */
    where?: TenancyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenancies to fetch.
     */
    orderBy?: TenancyOrderByWithRelationInput | TenancyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tenancies.
     */
    cursor?: TenancyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenancies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenancies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tenancies.
     */
    distinct?: TenancyScalarFieldEnum | TenancyScalarFieldEnum[]
  }

  /**
   * Tenancy create
   */
  export type TenancyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * The data needed to create a Tenancy.
     */
    data: XOR<TenancyCreateInput, TenancyUncheckedCreateInput>
  }

  /**
   * Tenancy createMany
   */
  export type TenancyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tenancies.
     */
    data: TenancyCreateManyInput | TenancyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Tenancy createManyAndReturn
   */
  export type TenancyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * The data used to create many Tenancies.
     */
    data: TenancyCreateManyInput | TenancyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Tenancy update
   */
  export type TenancyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * The data needed to update a Tenancy.
     */
    data: XOR<TenancyUpdateInput, TenancyUncheckedUpdateInput>
    /**
     * Choose, which Tenancy to update.
     */
    where: TenancyWhereUniqueInput
  }

  /**
   * Tenancy updateMany
   */
  export type TenancyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tenancies.
     */
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyInput>
    /**
     * Filter which Tenancies to update
     */
    where?: TenancyWhereInput
    /**
     * Limit how many Tenancies to update.
     */
    limit?: number
  }

  /**
   * Tenancy updateManyAndReturn
   */
  export type TenancyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * The data used to update Tenancies.
     */
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyInput>
    /**
     * Filter which Tenancies to update
     */
    where?: TenancyWhereInput
    /**
     * Limit how many Tenancies to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Tenancy upsert
   */
  export type TenancyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * The filter to search for the Tenancy to update in case it exists.
     */
    where: TenancyWhereUniqueInput
    /**
     * In case the Tenancy found by the `where` argument doesn't exist, create a new Tenancy with this data.
     */
    create: XOR<TenancyCreateInput, TenancyUncheckedCreateInput>
    /**
     * In case the Tenancy was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenancyUpdateInput, TenancyUncheckedUpdateInput>
  }

  /**
   * Tenancy delete
   */
  export type TenancyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
    /**
     * Filter which Tenancy to delete.
     */
    where: TenancyWhereUniqueInput
  }

  /**
   * Tenancy deleteMany
   */
  export type TenancyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tenancies to delete
     */
    where?: TenancyWhereInput
    /**
     * Limit how many Tenancies to delete.
     */
    limit?: number
  }

  /**
   * Tenancy.agent
   */
  export type Tenancy$agentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    where?: StakeholderWhereInput
  }

  /**
   * Tenancy.inspections
   */
  export type Tenancy$inspectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    where?: InspectionWhereInput
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    cursor?: InspectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InspectionScalarFieldEnum | InspectionScalarFieldEnum[]
  }

  /**
   * Tenancy without action
   */
  export type TenancyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenancy
     */
    select?: TenancySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenancy
     */
    omit?: TenancyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenancyInclude<ExtArgs> | null
  }


  /**
   * Model Inspection
   */

  export type AggregateInspection = {
    _count: InspectionCountAggregateOutputType | null
    _min: InspectionMinAggregateOutputType | null
    _max: InspectionMaxAggregateOutputType | null
  }

  export type InspectionMinAggregateOutputType = {
    id: string | null
    tenancyId: string | null
    kind: $Enums.InspectionKind | null
    status: $Enums.InspectionStatus | null
    conductedById: string | null
    conductedAt: Date | null
    baselineId: string | null
    summary: string | null
    processingError: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InspectionMaxAggregateOutputType = {
    id: string | null
    tenancyId: string | null
    kind: $Enums.InspectionKind | null
    status: $Enums.InspectionStatus | null
    conductedById: string | null
    conductedAt: Date | null
    baselineId: string | null
    summary: string | null
    processingError: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InspectionCountAggregateOutputType = {
    id: number
    tenancyId: number
    kind: number
    status: number
    conductedById: number
    conductedAt: number
    baselineId: number
    summary: number
    processingError: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InspectionMinAggregateInputType = {
    id?: true
    tenancyId?: true
    kind?: true
    status?: true
    conductedById?: true
    conductedAt?: true
    baselineId?: true
    summary?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InspectionMaxAggregateInputType = {
    id?: true
    tenancyId?: true
    kind?: true
    status?: true
    conductedById?: true
    conductedAt?: true
    baselineId?: true
    summary?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InspectionCountAggregateInputType = {
    id?: true
    tenancyId?: true
    kind?: true
    status?: true
    conductedById?: true
    conductedAt?: true
    baselineId?: true
    summary?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InspectionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Inspection to aggregate.
     */
    where?: InspectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Inspections to fetch.
     */
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InspectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Inspections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Inspections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Inspections
    **/
    _count?: true | InspectionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InspectionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InspectionMaxAggregateInputType
  }

  export type GetInspectionAggregateType<T extends InspectionAggregateArgs> = {
        [P in keyof T & keyof AggregateInspection]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInspection[P]>
      : GetScalarType<T[P], AggregateInspection[P]>
  }




  export type InspectionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionWhereInput
    orderBy?: InspectionOrderByWithAggregationInput | InspectionOrderByWithAggregationInput[]
    by: InspectionScalarFieldEnum[] | InspectionScalarFieldEnum
    having?: InspectionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InspectionCountAggregateInputType | true
    _min?: InspectionMinAggregateInputType
    _max?: InspectionMaxAggregateInputType
  }

  export type InspectionGroupByOutputType = {
    id: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status: $Enums.InspectionStatus
    conductedById: string | null
    conductedAt: Date | null
    baselineId: string | null
    summary: string | null
    processingError: string | null
    createdAt: Date
    updatedAt: Date
    _count: InspectionCountAggregateOutputType | null
    _min: InspectionMinAggregateOutputType | null
    _max: InspectionMaxAggregateOutputType | null
  }

  type GetInspectionGroupByPayload<T extends InspectionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InspectionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InspectionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InspectionGroupByOutputType[P]>
            : GetScalarType<T[P], InspectionGroupByOutputType[P]>
        }
      >
    >


  export type InspectionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenancyId?: boolean
    kind?: boolean
    status?: boolean
    conductedById?: boolean
    conductedAt?: boolean
    baselineId?: boolean
    summary?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
    checkOut?: boolean | Inspection$checkOutArgs<ExtArgs>
    rooms?: boolean | Inspection$roomsArgs<ExtArgs>
    findings?: boolean | Inspection$findingsArgs<ExtArgs>
    signatures?: boolean | Inspection$signaturesArgs<ExtArgs>
    _count?: boolean | InspectionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["inspection"]>

  export type InspectionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenancyId?: boolean
    kind?: boolean
    status?: boolean
    conductedById?: boolean
    conductedAt?: boolean
    baselineId?: boolean
    summary?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
  }, ExtArgs["result"]["inspection"]>

  export type InspectionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenancyId?: boolean
    kind?: boolean
    status?: boolean
    conductedById?: boolean
    conductedAt?: boolean
    baselineId?: boolean
    summary?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
  }, ExtArgs["result"]["inspection"]>

  export type InspectionSelectScalar = {
    id?: boolean
    tenancyId?: boolean
    kind?: boolean
    status?: boolean
    conductedById?: boolean
    conductedAt?: boolean
    baselineId?: boolean
    summary?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InspectionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "tenancyId" | "kind" | "status" | "conductedById" | "conductedAt" | "baselineId" | "summary" | "processingError" | "createdAt" | "updatedAt", ExtArgs["result"]["inspection"]>
  export type InspectionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
    checkOut?: boolean | Inspection$checkOutArgs<ExtArgs>
    rooms?: boolean | Inspection$roomsArgs<ExtArgs>
    findings?: boolean | Inspection$findingsArgs<ExtArgs>
    signatures?: boolean | Inspection$signaturesArgs<ExtArgs>
    _count?: boolean | InspectionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InspectionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
  }
  export type InspectionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenancy?: boolean | TenancyDefaultArgs<ExtArgs>
    conductedBy?: boolean | Inspection$conductedByArgs<ExtArgs>
    baseline?: boolean | Inspection$baselineArgs<ExtArgs>
  }

  export type $InspectionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Inspection"
    objects: {
      tenancy: Prisma.$TenancyPayload<ExtArgs>
      conductedBy: Prisma.$StakeholderPayload<ExtArgs> | null
      baseline: Prisma.$InspectionPayload<ExtArgs> | null
      checkOut: Prisma.$InspectionPayload<ExtArgs> | null
      rooms: Prisma.$RoomPayload<ExtArgs>[]
      findings: Prisma.$FindingPayload<ExtArgs>[]
      signatures: Prisma.$SignaturePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tenancyId: string
      kind: $Enums.InspectionKind
      status: $Enums.InspectionStatus
      conductedById: string | null
      conductedAt: Date | null
      /**
       * A check-out points at the check-in it is measured against.
       */
      baselineId: string | null
      summary: string | null
      processingError: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["inspection"]>
    composites: {}
  }

  type InspectionGetPayload<S extends boolean | null | undefined | InspectionDefaultArgs> = $Result.GetResult<Prisma.$InspectionPayload, S>

  type InspectionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InspectionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InspectionCountAggregateInputType | true
    }

  export interface InspectionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Inspection'], meta: { name: 'Inspection' } }
    /**
     * Find zero or one Inspection that matches the filter.
     * @param {InspectionFindUniqueArgs} args - Arguments to find a Inspection
     * @example
     * // Get one Inspection
     * const inspection = await prisma.inspection.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InspectionFindUniqueArgs>(args: SelectSubset<T, InspectionFindUniqueArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Inspection that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InspectionFindUniqueOrThrowArgs} args - Arguments to find a Inspection
     * @example
     * // Get one Inspection
     * const inspection = await prisma.inspection.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InspectionFindUniqueOrThrowArgs>(args: SelectSubset<T, InspectionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Inspection that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionFindFirstArgs} args - Arguments to find a Inspection
     * @example
     * // Get one Inspection
     * const inspection = await prisma.inspection.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InspectionFindFirstArgs>(args?: SelectSubset<T, InspectionFindFirstArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Inspection that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionFindFirstOrThrowArgs} args - Arguments to find a Inspection
     * @example
     * // Get one Inspection
     * const inspection = await prisma.inspection.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InspectionFindFirstOrThrowArgs>(args?: SelectSubset<T, InspectionFindFirstOrThrowArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Inspections that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Inspections
     * const inspections = await prisma.inspection.findMany()
     * 
     * // Get first 10 Inspections
     * const inspections = await prisma.inspection.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const inspectionWithIdOnly = await prisma.inspection.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InspectionFindManyArgs>(args?: SelectSubset<T, InspectionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Inspection.
     * @param {InspectionCreateArgs} args - Arguments to create a Inspection.
     * @example
     * // Create one Inspection
     * const Inspection = await prisma.inspection.create({
     *   data: {
     *     // ... data to create a Inspection
     *   }
     * })
     * 
     */
    create<T extends InspectionCreateArgs>(args: SelectSubset<T, InspectionCreateArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Inspections.
     * @param {InspectionCreateManyArgs} args - Arguments to create many Inspections.
     * @example
     * // Create many Inspections
     * const inspection = await prisma.inspection.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InspectionCreateManyArgs>(args?: SelectSubset<T, InspectionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Inspections and returns the data saved in the database.
     * @param {InspectionCreateManyAndReturnArgs} args - Arguments to create many Inspections.
     * @example
     * // Create many Inspections
     * const inspection = await prisma.inspection.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Inspections and only return the `id`
     * const inspectionWithIdOnly = await prisma.inspection.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InspectionCreateManyAndReturnArgs>(args?: SelectSubset<T, InspectionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Inspection.
     * @param {InspectionDeleteArgs} args - Arguments to delete one Inspection.
     * @example
     * // Delete one Inspection
     * const Inspection = await prisma.inspection.delete({
     *   where: {
     *     // ... filter to delete one Inspection
     *   }
     * })
     * 
     */
    delete<T extends InspectionDeleteArgs>(args: SelectSubset<T, InspectionDeleteArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Inspection.
     * @param {InspectionUpdateArgs} args - Arguments to update one Inspection.
     * @example
     * // Update one Inspection
     * const inspection = await prisma.inspection.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InspectionUpdateArgs>(args: SelectSubset<T, InspectionUpdateArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Inspections.
     * @param {InspectionDeleteManyArgs} args - Arguments to filter Inspections to delete.
     * @example
     * // Delete a few Inspections
     * const { count } = await prisma.inspection.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InspectionDeleteManyArgs>(args?: SelectSubset<T, InspectionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Inspections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Inspections
     * const inspection = await prisma.inspection.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InspectionUpdateManyArgs>(args: SelectSubset<T, InspectionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Inspections and returns the data updated in the database.
     * @param {InspectionUpdateManyAndReturnArgs} args - Arguments to update many Inspections.
     * @example
     * // Update many Inspections
     * const inspection = await prisma.inspection.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Inspections and only return the `id`
     * const inspectionWithIdOnly = await prisma.inspection.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InspectionUpdateManyAndReturnArgs>(args: SelectSubset<T, InspectionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Inspection.
     * @param {InspectionUpsertArgs} args - Arguments to update or create a Inspection.
     * @example
     * // Update or create a Inspection
     * const inspection = await prisma.inspection.upsert({
     *   create: {
     *     // ... data to create a Inspection
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Inspection we want to update
     *   }
     * })
     */
    upsert<T extends InspectionUpsertArgs>(args: SelectSubset<T, InspectionUpsertArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Inspections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionCountArgs} args - Arguments to filter Inspections to count.
     * @example
     * // Count the number of Inspections
     * const count = await prisma.inspection.count({
     *   where: {
     *     // ... the filter for the Inspections we want to count
     *   }
     * })
    **/
    count<T extends InspectionCountArgs>(
      args?: Subset<T, InspectionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InspectionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Inspection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InspectionAggregateArgs>(args: Subset<T, InspectionAggregateArgs>): Prisma.PrismaPromise<GetInspectionAggregateType<T>>

    /**
     * Group by Inspection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InspectionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InspectionGroupByArgs['orderBy'] }
        : { orderBy?: InspectionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InspectionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInspectionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Inspection model
   */
  readonly fields: InspectionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Inspection.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InspectionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenancy<T extends TenancyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TenancyDefaultArgs<ExtArgs>>): Prisma__TenancyClient<$Result.GetResult<Prisma.$TenancyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    conductedBy<T extends Inspection$conductedByArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$conductedByArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    baseline<T extends Inspection$baselineArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$baselineArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    checkOut<T extends Inspection$checkOutArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$checkOutArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    rooms<T extends Inspection$roomsArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$roomsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    findings<T extends Inspection$findingsArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$findingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    signatures<T extends Inspection$signaturesArgs<ExtArgs> = {}>(args?: Subset<T, Inspection$signaturesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Inspection model
   */
  interface InspectionFieldRefs {
    readonly id: FieldRef<"Inspection", 'String'>
    readonly tenancyId: FieldRef<"Inspection", 'String'>
    readonly kind: FieldRef<"Inspection", 'InspectionKind'>
    readonly status: FieldRef<"Inspection", 'InspectionStatus'>
    readonly conductedById: FieldRef<"Inspection", 'String'>
    readonly conductedAt: FieldRef<"Inspection", 'DateTime'>
    readonly baselineId: FieldRef<"Inspection", 'String'>
    readonly summary: FieldRef<"Inspection", 'String'>
    readonly processingError: FieldRef<"Inspection", 'String'>
    readonly createdAt: FieldRef<"Inspection", 'DateTime'>
    readonly updatedAt: FieldRef<"Inspection", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Inspection findUnique
   */
  export type InspectionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter, which Inspection to fetch.
     */
    where: InspectionWhereUniqueInput
  }

  /**
   * Inspection findUniqueOrThrow
   */
  export type InspectionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter, which Inspection to fetch.
     */
    where: InspectionWhereUniqueInput
  }

  /**
   * Inspection findFirst
   */
  export type InspectionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter, which Inspection to fetch.
     */
    where?: InspectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Inspections to fetch.
     */
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Inspections.
     */
    cursor?: InspectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Inspections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Inspections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Inspections.
     */
    distinct?: InspectionScalarFieldEnum | InspectionScalarFieldEnum[]
  }

  /**
   * Inspection findFirstOrThrow
   */
  export type InspectionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter, which Inspection to fetch.
     */
    where?: InspectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Inspections to fetch.
     */
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Inspections.
     */
    cursor?: InspectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Inspections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Inspections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Inspections.
     */
    distinct?: InspectionScalarFieldEnum | InspectionScalarFieldEnum[]
  }

  /**
   * Inspection findMany
   */
  export type InspectionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter, which Inspections to fetch.
     */
    where?: InspectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Inspections to fetch.
     */
    orderBy?: InspectionOrderByWithRelationInput | InspectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Inspections.
     */
    cursor?: InspectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Inspections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Inspections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Inspections.
     */
    distinct?: InspectionScalarFieldEnum | InspectionScalarFieldEnum[]
  }

  /**
   * Inspection create
   */
  export type InspectionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * The data needed to create a Inspection.
     */
    data: XOR<InspectionCreateInput, InspectionUncheckedCreateInput>
  }

  /**
   * Inspection createMany
   */
  export type InspectionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Inspections.
     */
    data: InspectionCreateManyInput | InspectionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Inspection createManyAndReturn
   */
  export type InspectionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * The data used to create many Inspections.
     */
    data: InspectionCreateManyInput | InspectionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Inspection update
   */
  export type InspectionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * The data needed to update a Inspection.
     */
    data: XOR<InspectionUpdateInput, InspectionUncheckedUpdateInput>
    /**
     * Choose, which Inspection to update.
     */
    where: InspectionWhereUniqueInput
  }

  /**
   * Inspection updateMany
   */
  export type InspectionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Inspections.
     */
    data: XOR<InspectionUpdateManyMutationInput, InspectionUncheckedUpdateManyInput>
    /**
     * Filter which Inspections to update
     */
    where?: InspectionWhereInput
    /**
     * Limit how many Inspections to update.
     */
    limit?: number
  }

  /**
   * Inspection updateManyAndReturn
   */
  export type InspectionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * The data used to update Inspections.
     */
    data: XOR<InspectionUpdateManyMutationInput, InspectionUncheckedUpdateManyInput>
    /**
     * Filter which Inspections to update
     */
    where?: InspectionWhereInput
    /**
     * Limit how many Inspections to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Inspection upsert
   */
  export type InspectionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * The filter to search for the Inspection to update in case it exists.
     */
    where: InspectionWhereUniqueInput
    /**
     * In case the Inspection found by the `where` argument doesn't exist, create a new Inspection with this data.
     */
    create: XOR<InspectionCreateInput, InspectionUncheckedCreateInput>
    /**
     * In case the Inspection was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InspectionUpdateInput, InspectionUncheckedUpdateInput>
  }

  /**
   * Inspection delete
   */
  export type InspectionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    /**
     * Filter which Inspection to delete.
     */
    where: InspectionWhereUniqueInput
  }

  /**
   * Inspection deleteMany
   */
  export type InspectionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Inspections to delete
     */
    where?: InspectionWhereInput
    /**
     * Limit how many Inspections to delete.
     */
    limit?: number
  }

  /**
   * Inspection.conductedBy
   */
  export type Inspection$conductedByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Stakeholder
     */
    select?: StakeholderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Stakeholder
     */
    omit?: StakeholderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StakeholderInclude<ExtArgs> | null
    where?: StakeholderWhereInput
  }

  /**
   * Inspection.baseline
   */
  export type Inspection$baselineArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    where?: InspectionWhereInput
  }

  /**
   * Inspection.checkOut
   */
  export type Inspection$checkOutArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
    where?: InspectionWhereInput
  }

  /**
   * Inspection.rooms
   */
  export type Inspection$roomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    where?: RoomWhereInput
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    cursor?: RoomWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Inspection.findings
   */
  export type Inspection$findingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    where?: FindingWhereInput
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    cursor?: FindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * Inspection.signatures
   */
  export type Inspection$signaturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    where?: SignatureWhereInput
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    cursor?: SignatureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SignatureScalarFieldEnum | SignatureScalarFieldEnum[]
  }

  /**
   * Inspection without action
   */
  export type InspectionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Inspection
     */
    select?: InspectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Inspection
     */
    omit?: InspectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionInclude<ExtArgs> | null
  }


  /**
   * Model Capture
   */

  export type AggregateCapture = {
    _count: CaptureCountAggregateOutputType | null
    _avg: CaptureAvgAggregateOutputType | null
    _sum: CaptureSumAggregateOutputType | null
    _min: CaptureMinAggregateOutputType | null
    _max: CaptureMaxAggregateOutputType | null
  }

  export type CaptureAvgAggregateOutputType = {
    sizeBytes: number | null
    durationSec: number | null
  }

  export type CaptureSumAggregateOutputType = {
    sizeBytes: number | null
    durationSec: number | null
  }

  export type CaptureMinAggregateOutputType = {
    id: string | null
    roomId: string | null
    kind: $Enums.CaptureKind | null
    storagePath: string | null
    mimeType: string | null
    sizeBytes: number | null
    durationSec: number | null
    transcript: string | null
    note: string | null
    processedAt: Date | null
    createdAt: Date | null
  }

  export type CaptureMaxAggregateOutputType = {
    id: string | null
    roomId: string | null
    kind: $Enums.CaptureKind | null
    storagePath: string | null
    mimeType: string | null
    sizeBytes: number | null
    durationSec: number | null
    transcript: string | null
    note: string | null
    processedAt: Date | null
    createdAt: Date | null
  }

  export type CaptureCountAggregateOutputType = {
    id: number
    roomId: number
    kind: number
    storagePath: number
    mimeType: number
    sizeBytes: number
    durationSec: number
    transcript: number
    note: number
    processedAt: number
    createdAt: number
    _all: number
  }


  export type CaptureAvgAggregateInputType = {
    sizeBytes?: true
    durationSec?: true
  }

  export type CaptureSumAggregateInputType = {
    sizeBytes?: true
    durationSec?: true
  }

  export type CaptureMinAggregateInputType = {
    id?: true
    roomId?: true
    kind?: true
    storagePath?: true
    mimeType?: true
    sizeBytes?: true
    durationSec?: true
    transcript?: true
    note?: true
    processedAt?: true
    createdAt?: true
  }

  export type CaptureMaxAggregateInputType = {
    id?: true
    roomId?: true
    kind?: true
    storagePath?: true
    mimeType?: true
    sizeBytes?: true
    durationSec?: true
    transcript?: true
    note?: true
    processedAt?: true
    createdAt?: true
  }

  export type CaptureCountAggregateInputType = {
    id?: true
    roomId?: true
    kind?: true
    storagePath?: true
    mimeType?: true
    sizeBytes?: true
    durationSec?: true
    transcript?: true
    note?: true
    processedAt?: true
    createdAt?: true
    _all?: true
  }

  export type CaptureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Capture to aggregate.
     */
    where?: CaptureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Captures to fetch.
     */
    orderBy?: CaptureOrderByWithRelationInput | CaptureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CaptureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Captures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Captures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Captures
    **/
    _count?: true | CaptureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CaptureAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CaptureSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CaptureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CaptureMaxAggregateInputType
  }

  export type GetCaptureAggregateType<T extends CaptureAggregateArgs> = {
        [P in keyof T & keyof AggregateCapture]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCapture[P]>
      : GetScalarType<T[P], AggregateCapture[P]>
  }




  export type CaptureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CaptureWhereInput
    orderBy?: CaptureOrderByWithAggregationInput | CaptureOrderByWithAggregationInput[]
    by: CaptureScalarFieldEnum[] | CaptureScalarFieldEnum
    having?: CaptureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CaptureCountAggregateInputType | true
    _avg?: CaptureAvgAggregateInputType
    _sum?: CaptureSumAggregateInputType
    _min?: CaptureMinAggregateInputType
    _max?: CaptureMaxAggregateInputType
  }

  export type CaptureGroupByOutputType = {
    id: string
    roomId: string
    kind: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec: number | null
    transcript: string | null
    note: string | null
    processedAt: Date | null
    createdAt: Date
    _count: CaptureCountAggregateOutputType | null
    _avg: CaptureAvgAggregateOutputType | null
    _sum: CaptureSumAggregateOutputType | null
    _min: CaptureMinAggregateOutputType | null
    _max: CaptureMaxAggregateOutputType | null
  }

  type GetCaptureGroupByPayload<T extends CaptureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CaptureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CaptureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CaptureGroupByOutputType[P]>
            : GetScalarType<T[P], CaptureGroupByOutputType[P]>
        }
      >
    >


  export type CaptureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    kind?: boolean
    storagePath?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    durationSec?: boolean
    transcript?: boolean
    note?: boolean
    processedAt?: boolean
    createdAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
    items?: boolean | Capture$itemsArgs<ExtArgs>
    _count?: boolean | CaptureCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["capture"]>

  export type CaptureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    kind?: boolean
    storagePath?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    durationSec?: boolean
    transcript?: boolean
    note?: boolean
    processedAt?: boolean
    createdAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["capture"]>

  export type CaptureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    kind?: boolean
    storagePath?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    durationSec?: boolean
    transcript?: boolean
    note?: boolean
    processedAt?: boolean
    createdAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["capture"]>

  export type CaptureSelectScalar = {
    id?: boolean
    roomId?: boolean
    kind?: boolean
    storagePath?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    durationSec?: boolean
    transcript?: boolean
    note?: boolean
    processedAt?: boolean
    createdAt?: boolean
  }

  export type CaptureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "roomId" | "kind" | "storagePath" | "mimeType" | "sizeBytes" | "durationSec" | "transcript" | "note" | "processedAt" | "createdAt", ExtArgs["result"]["capture"]>
  export type CaptureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
    items?: boolean | Capture$itemsArgs<ExtArgs>
    _count?: boolean | CaptureCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CaptureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
  }
  export type CaptureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
  }

  export type $CapturePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Capture"
    objects: {
      room: Prisma.$RoomPayload<ExtArgs>
      items: Prisma.$InspectionItemPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      roomId: string
      kind: $Enums.CaptureKind
      storagePath: string
      mimeType: string
      sizeBytes: number
      durationSec: number | null
      /**
       * What the inspector said while recording, or typed against a photo.
       */
      transcript: string | null
      /**
       * Inspector's own note attached at capture time, before any model sees it.
       */
      note: string | null
      processedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["capture"]>
    composites: {}
  }

  type CaptureGetPayload<S extends boolean | null | undefined | CaptureDefaultArgs> = $Result.GetResult<Prisma.$CapturePayload, S>

  type CaptureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CaptureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CaptureCountAggregateInputType | true
    }

  export interface CaptureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Capture'], meta: { name: 'Capture' } }
    /**
     * Find zero or one Capture that matches the filter.
     * @param {CaptureFindUniqueArgs} args - Arguments to find a Capture
     * @example
     * // Get one Capture
     * const capture = await prisma.capture.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CaptureFindUniqueArgs>(args: SelectSubset<T, CaptureFindUniqueArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Capture that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CaptureFindUniqueOrThrowArgs} args - Arguments to find a Capture
     * @example
     * // Get one Capture
     * const capture = await prisma.capture.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CaptureFindUniqueOrThrowArgs>(args: SelectSubset<T, CaptureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Capture that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureFindFirstArgs} args - Arguments to find a Capture
     * @example
     * // Get one Capture
     * const capture = await prisma.capture.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CaptureFindFirstArgs>(args?: SelectSubset<T, CaptureFindFirstArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Capture that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureFindFirstOrThrowArgs} args - Arguments to find a Capture
     * @example
     * // Get one Capture
     * const capture = await prisma.capture.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CaptureFindFirstOrThrowArgs>(args?: SelectSubset<T, CaptureFindFirstOrThrowArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Captures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Captures
     * const captures = await prisma.capture.findMany()
     * 
     * // Get first 10 Captures
     * const captures = await prisma.capture.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const captureWithIdOnly = await prisma.capture.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CaptureFindManyArgs>(args?: SelectSubset<T, CaptureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Capture.
     * @param {CaptureCreateArgs} args - Arguments to create a Capture.
     * @example
     * // Create one Capture
     * const Capture = await prisma.capture.create({
     *   data: {
     *     // ... data to create a Capture
     *   }
     * })
     * 
     */
    create<T extends CaptureCreateArgs>(args: SelectSubset<T, CaptureCreateArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Captures.
     * @param {CaptureCreateManyArgs} args - Arguments to create many Captures.
     * @example
     * // Create many Captures
     * const capture = await prisma.capture.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CaptureCreateManyArgs>(args?: SelectSubset<T, CaptureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Captures and returns the data saved in the database.
     * @param {CaptureCreateManyAndReturnArgs} args - Arguments to create many Captures.
     * @example
     * // Create many Captures
     * const capture = await prisma.capture.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Captures and only return the `id`
     * const captureWithIdOnly = await prisma.capture.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CaptureCreateManyAndReturnArgs>(args?: SelectSubset<T, CaptureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Capture.
     * @param {CaptureDeleteArgs} args - Arguments to delete one Capture.
     * @example
     * // Delete one Capture
     * const Capture = await prisma.capture.delete({
     *   where: {
     *     // ... filter to delete one Capture
     *   }
     * })
     * 
     */
    delete<T extends CaptureDeleteArgs>(args: SelectSubset<T, CaptureDeleteArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Capture.
     * @param {CaptureUpdateArgs} args - Arguments to update one Capture.
     * @example
     * // Update one Capture
     * const capture = await prisma.capture.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CaptureUpdateArgs>(args: SelectSubset<T, CaptureUpdateArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Captures.
     * @param {CaptureDeleteManyArgs} args - Arguments to filter Captures to delete.
     * @example
     * // Delete a few Captures
     * const { count } = await prisma.capture.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CaptureDeleteManyArgs>(args?: SelectSubset<T, CaptureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Captures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Captures
     * const capture = await prisma.capture.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CaptureUpdateManyArgs>(args: SelectSubset<T, CaptureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Captures and returns the data updated in the database.
     * @param {CaptureUpdateManyAndReturnArgs} args - Arguments to update many Captures.
     * @example
     * // Update many Captures
     * const capture = await prisma.capture.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Captures and only return the `id`
     * const captureWithIdOnly = await prisma.capture.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CaptureUpdateManyAndReturnArgs>(args: SelectSubset<T, CaptureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Capture.
     * @param {CaptureUpsertArgs} args - Arguments to update or create a Capture.
     * @example
     * // Update or create a Capture
     * const capture = await prisma.capture.upsert({
     *   create: {
     *     // ... data to create a Capture
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Capture we want to update
     *   }
     * })
     */
    upsert<T extends CaptureUpsertArgs>(args: SelectSubset<T, CaptureUpsertArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Captures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureCountArgs} args - Arguments to filter Captures to count.
     * @example
     * // Count the number of Captures
     * const count = await prisma.capture.count({
     *   where: {
     *     // ... the filter for the Captures we want to count
     *   }
     * })
    **/
    count<T extends CaptureCountArgs>(
      args?: Subset<T, CaptureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CaptureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Capture.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CaptureAggregateArgs>(args: Subset<T, CaptureAggregateArgs>): Prisma.PrismaPromise<GetCaptureAggregateType<T>>

    /**
     * Group by Capture.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CaptureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CaptureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CaptureGroupByArgs['orderBy'] }
        : { orderBy?: CaptureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CaptureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCaptureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Capture model
   */
  readonly fields: CaptureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Capture.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CaptureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    room<T extends RoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RoomDefaultArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    items<T extends Capture$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Capture$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Capture model
   */
  interface CaptureFieldRefs {
    readonly id: FieldRef<"Capture", 'String'>
    readonly roomId: FieldRef<"Capture", 'String'>
    readonly kind: FieldRef<"Capture", 'CaptureKind'>
    readonly storagePath: FieldRef<"Capture", 'String'>
    readonly mimeType: FieldRef<"Capture", 'String'>
    readonly sizeBytes: FieldRef<"Capture", 'Int'>
    readonly durationSec: FieldRef<"Capture", 'Int'>
    readonly transcript: FieldRef<"Capture", 'String'>
    readonly note: FieldRef<"Capture", 'String'>
    readonly processedAt: FieldRef<"Capture", 'DateTime'>
    readonly createdAt: FieldRef<"Capture", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Capture findUnique
   */
  export type CaptureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter, which Capture to fetch.
     */
    where: CaptureWhereUniqueInput
  }

  /**
   * Capture findUniqueOrThrow
   */
  export type CaptureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter, which Capture to fetch.
     */
    where: CaptureWhereUniqueInput
  }

  /**
   * Capture findFirst
   */
  export type CaptureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter, which Capture to fetch.
     */
    where?: CaptureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Captures to fetch.
     */
    orderBy?: CaptureOrderByWithRelationInput | CaptureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Captures.
     */
    cursor?: CaptureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Captures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Captures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Captures.
     */
    distinct?: CaptureScalarFieldEnum | CaptureScalarFieldEnum[]
  }

  /**
   * Capture findFirstOrThrow
   */
  export type CaptureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter, which Capture to fetch.
     */
    where?: CaptureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Captures to fetch.
     */
    orderBy?: CaptureOrderByWithRelationInput | CaptureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Captures.
     */
    cursor?: CaptureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Captures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Captures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Captures.
     */
    distinct?: CaptureScalarFieldEnum | CaptureScalarFieldEnum[]
  }

  /**
   * Capture findMany
   */
  export type CaptureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter, which Captures to fetch.
     */
    where?: CaptureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Captures to fetch.
     */
    orderBy?: CaptureOrderByWithRelationInput | CaptureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Captures.
     */
    cursor?: CaptureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Captures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Captures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Captures.
     */
    distinct?: CaptureScalarFieldEnum | CaptureScalarFieldEnum[]
  }

  /**
   * Capture create
   */
  export type CaptureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * The data needed to create a Capture.
     */
    data: XOR<CaptureCreateInput, CaptureUncheckedCreateInput>
  }

  /**
   * Capture createMany
   */
  export type CaptureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Captures.
     */
    data: CaptureCreateManyInput | CaptureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Capture createManyAndReturn
   */
  export type CaptureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * The data used to create many Captures.
     */
    data: CaptureCreateManyInput | CaptureCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Capture update
   */
  export type CaptureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * The data needed to update a Capture.
     */
    data: XOR<CaptureUpdateInput, CaptureUncheckedUpdateInput>
    /**
     * Choose, which Capture to update.
     */
    where: CaptureWhereUniqueInput
  }

  /**
   * Capture updateMany
   */
  export type CaptureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Captures.
     */
    data: XOR<CaptureUpdateManyMutationInput, CaptureUncheckedUpdateManyInput>
    /**
     * Filter which Captures to update
     */
    where?: CaptureWhereInput
    /**
     * Limit how many Captures to update.
     */
    limit?: number
  }

  /**
   * Capture updateManyAndReturn
   */
  export type CaptureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * The data used to update Captures.
     */
    data: XOR<CaptureUpdateManyMutationInput, CaptureUncheckedUpdateManyInput>
    /**
     * Filter which Captures to update
     */
    where?: CaptureWhereInput
    /**
     * Limit how many Captures to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Capture upsert
   */
  export type CaptureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * The filter to search for the Capture to update in case it exists.
     */
    where: CaptureWhereUniqueInput
    /**
     * In case the Capture found by the `where` argument doesn't exist, create a new Capture with this data.
     */
    create: XOR<CaptureCreateInput, CaptureUncheckedCreateInput>
    /**
     * In case the Capture was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CaptureUpdateInput, CaptureUncheckedUpdateInput>
  }

  /**
   * Capture delete
   */
  export type CaptureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    /**
     * Filter which Capture to delete.
     */
    where: CaptureWhereUniqueInput
  }

  /**
   * Capture deleteMany
   */
  export type CaptureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Captures to delete
     */
    where?: CaptureWhereInput
    /**
     * Limit how many Captures to delete.
     */
    limit?: number
  }

  /**
   * Capture.items
   */
  export type Capture$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    where?: InspectionItemWhereInput
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    cursor?: InspectionItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InspectionItemScalarFieldEnum | InspectionItemScalarFieldEnum[]
  }

  /**
   * Capture without action
   */
  export type CaptureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
  }


  /**
   * Model Room
   */

  export type AggregateRoom = {
    _count: RoomCountAggregateOutputType | null
    _avg: RoomAvgAggregateOutputType | null
    _sum: RoomSumAggregateOutputType | null
    _min: RoomMinAggregateOutputType | null
    _max: RoomMaxAggregateOutputType | null
  }

  export type RoomAvgAggregateOutputType = {
    order: number | null
  }

  export type RoomSumAggregateOutputType = {
    order: number | null
  }

  export type RoomMinAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    name: string | null
    order: number | null
    status: $Enums.RoomStatus | null
    processingError: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RoomMaxAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    name: string | null
    order: number | null
    status: $Enums.RoomStatus | null
    processingError: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RoomCountAggregateOutputType = {
    id: number
    inspectionId: number
    name: number
    order: number
    status: number
    processingError: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RoomAvgAggregateInputType = {
    order?: true
  }

  export type RoomSumAggregateInputType = {
    order?: true
  }

  export type RoomMinAggregateInputType = {
    id?: true
    inspectionId?: true
    name?: true
    order?: true
    status?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RoomMaxAggregateInputType = {
    id?: true
    inspectionId?: true
    name?: true
    order?: true
    status?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RoomCountAggregateInputType = {
    id?: true
    inspectionId?: true
    name?: true
    order?: true
    status?: true
    processingError?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RoomAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Room to aggregate.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Rooms
    **/
    _count?: true | RoomCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RoomAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RoomSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RoomMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RoomMaxAggregateInputType
  }

  export type GetRoomAggregateType<T extends RoomAggregateArgs> = {
        [P in keyof T & keyof AggregateRoom]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoom[P]>
      : GetScalarType<T[P], AggregateRoom[P]>
  }




  export type RoomGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomWhereInput
    orderBy?: RoomOrderByWithAggregationInput | RoomOrderByWithAggregationInput[]
    by: RoomScalarFieldEnum[] | RoomScalarFieldEnum
    having?: RoomScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RoomCountAggregateInputType | true
    _avg?: RoomAvgAggregateInputType
    _sum?: RoomSumAggregateInputType
    _min?: RoomMinAggregateInputType
    _max?: RoomMaxAggregateInputType
  }

  export type RoomGroupByOutputType = {
    id: string
    inspectionId: string
    name: string
    order: number
    status: $Enums.RoomStatus
    processingError: string | null
    createdAt: Date
    updatedAt: Date
    _count: RoomCountAggregateOutputType | null
    _avg: RoomAvgAggregateOutputType | null
    _sum: RoomSumAggregateOutputType | null
    _min: RoomMinAggregateOutputType | null
    _max: RoomMaxAggregateOutputType | null
  }

  type GetRoomGroupByPayload<T extends RoomGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RoomGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RoomGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RoomGroupByOutputType[P]>
            : GetScalarType<T[P], RoomGroupByOutputType[P]>
        }
      >
    >


  export type RoomSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    name?: boolean
    order?: boolean
    status?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    captures?: boolean | Room$capturesArgs<ExtArgs>
    items?: boolean | Room$itemsArgs<ExtArgs>
    _count?: boolean | RoomCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    name?: boolean
    order?: boolean
    status?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    name?: boolean
    order?: boolean
    status?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectScalar = {
    id?: boolean
    inspectionId?: boolean
    name?: boolean
    order?: boolean
    status?: boolean
    processingError?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RoomOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "inspectionId" | "name" | "order" | "status" | "processingError" | "createdAt" | "updatedAt", ExtArgs["result"]["room"]>
  export type RoomInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    captures?: boolean | Room$capturesArgs<ExtArgs>
    items?: boolean | Room$itemsArgs<ExtArgs>
    _count?: boolean | RoomCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RoomIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
  }
  export type RoomIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
  }

  export type $RoomPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Room"
    objects: {
      inspection: Prisma.$InspectionPayload<ExtArgs>
      captures: Prisma.$CapturePayload<ExtArgs>[]
      items: Prisma.$InspectionItemPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      inspectionId: string
      name: string
      order: number
      status: $Enums.RoomStatus
      processingError: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["room"]>
    composites: {}
  }

  type RoomGetPayload<S extends boolean | null | undefined | RoomDefaultArgs> = $Result.GetResult<Prisma.$RoomPayload, S>

  type RoomCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RoomFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RoomCountAggregateInputType | true
    }

  export interface RoomDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Room'], meta: { name: 'Room' } }
    /**
     * Find zero or one Room that matches the filter.
     * @param {RoomFindUniqueArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RoomFindUniqueArgs>(args: SelectSubset<T, RoomFindUniqueArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Room that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RoomFindUniqueOrThrowArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RoomFindUniqueOrThrowArgs>(args: SelectSubset<T, RoomFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Room that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindFirstArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RoomFindFirstArgs>(args?: SelectSubset<T, RoomFindFirstArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Room that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindFirstOrThrowArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RoomFindFirstOrThrowArgs>(args?: SelectSubset<T, RoomFindFirstOrThrowArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Rooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Rooms
     * const rooms = await prisma.room.findMany()
     * 
     * // Get first 10 Rooms
     * const rooms = await prisma.room.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const roomWithIdOnly = await prisma.room.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RoomFindManyArgs>(args?: SelectSubset<T, RoomFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Room.
     * @param {RoomCreateArgs} args - Arguments to create a Room.
     * @example
     * // Create one Room
     * const Room = await prisma.room.create({
     *   data: {
     *     // ... data to create a Room
     *   }
     * })
     * 
     */
    create<T extends RoomCreateArgs>(args: SelectSubset<T, RoomCreateArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Rooms.
     * @param {RoomCreateManyArgs} args - Arguments to create many Rooms.
     * @example
     * // Create many Rooms
     * const room = await prisma.room.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RoomCreateManyArgs>(args?: SelectSubset<T, RoomCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Rooms and returns the data saved in the database.
     * @param {RoomCreateManyAndReturnArgs} args - Arguments to create many Rooms.
     * @example
     * // Create many Rooms
     * const room = await prisma.room.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Rooms and only return the `id`
     * const roomWithIdOnly = await prisma.room.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RoomCreateManyAndReturnArgs>(args?: SelectSubset<T, RoomCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Room.
     * @param {RoomDeleteArgs} args - Arguments to delete one Room.
     * @example
     * // Delete one Room
     * const Room = await prisma.room.delete({
     *   where: {
     *     // ... filter to delete one Room
     *   }
     * })
     * 
     */
    delete<T extends RoomDeleteArgs>(args: SelectSubset<T, RoomDeleteArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Room.
     * @param {RoomUpdateArgs} args - Arguments to update one Room.
     * @example
     * // Update one Room
     * const room = await prisma.room.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RoomUpdateArgs>(args: SelectSubset<T, RoomUpdateArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Rooms.
     * @param {RoomDeleteManyArgs} args - Arguments to filter Rooms to delete.
     * @example
     * // Delete a few Rooms
     * const { count } = await prisma.room.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RoomDeleteManyArgs>(args?: SelectSubset<T, RoomDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Rooms
     * const room = await prisma.room.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RoomUpdateManyArgs>(args: SelectSubset<T, RoomUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rooms and returns the data updated in the database.
     * @param {RoomUpdateManyAndReturnArgs} args - Arguments to update many Rooms.
     * @example
     * // Update many Rooms
     * const room = await prisma.room.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Rooms and only return the `id`
     * const roomWithIdOnly = await prisma.room.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RoomUpdateManyAndReturnArgs>(args: SelectSubset<T, RoomUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Room.
     * @param {RoomUpsertArgs} args - Arguments to update or create a Room.
     * @example
     * // Update or create a Room
     * const room = await prisma.room.upsert({
     *   create: {
     *     // ... data to create a Room
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Room we want to update
     *   }
     * })
     */
    upsert<T extends RoomUpsertArgs>(args: SelectSubset<T, RoomUpsertArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomCountArgs} args - Arguments to filter Rooms to count.
     * @example
     * // Count the number of Rooms
     * const count = await prisma.room.count({
     *   where: {
     *     // ... the filter for the Rooms we want to count
     *   }
     * })
    **/
    count<T extends RoomCountArgs>(
      args?: Subset<T, RoomCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RoomCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Room.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RoomAggregateArgs>(args: Subset<T, RoomAggregateArgs>): Prisma.PrismaPromise<GetRoomAggregateType<T>>

    /**
     * Group by Room.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RoomGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RoomGroupByArgs['orderBy'] }
        : { orderBy?: RoomGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RoomGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRoomGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Room model
   */
  readonly fields: RoomFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Room.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RoomClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    inspection<T extends InspectionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InspectionDefaultArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    captures<T extends Room$capturesArgs<ExtArgs> = {}>(args?: Subset<T, Room$capturesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    items<T extends Room$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Room$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Room model
   */
  interface RoomFieldRefs {
    readonly id: FieldRef<"Room", 'String'>
    readonly inspectionId: FieldRef<"Room", 'String'>
    readonly name: FieldRef<"Room", 'String'>
    readonly order: FieldRef<"Room", 'Int'>
    readonly status: FieldRef<"Room", 'RoomStatus'>
    readonly processingError: FieldRef<"Room", 'String'>
    readonly createdAt: FieldRef<"Room", 'DateTime'>
    readonly updatedAt: FieldRef<"Room", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Room findUnique
   */
  export type RoomFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room findUniqueOrThrow
   */
  export type RoomFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room findFirst
   */
  export type RoomFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rooms.
     */
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room findFirstOrThrow
   */
  export type RoomFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rooms.
     */
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room findMany
   */
  export type RoomFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Rooms to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rooms.
     */
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room create
   */
  export type RoomCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The data needed to create a Room.
     */
    data: XOR<RoomCreateInput, RoomUncheckedCreateInput>
  }

  /**
   * Room createMany
   */
  export type RoomCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Rooms.
     */
    data: RoomCreateManyInput | RoomCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Room createManyAndReturn
   */
  export type RoomCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * The data used to create many Rooms.
     */
    data: RoomCreateManyInput | RoomCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Room update
   */
  export type RoomUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The data needed to update a Room.
     */
    data: XOR<RoomUpdateInput, RoomUncheckedUpdateInput>
    /**
     * Choose, which Room to update.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room updateMany
   */
  export type RoomUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Rooms.
     */
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyInput>
    /**
     * Filter which Rooms to update
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to update.
     */
    limit?: number
  }

  /**
   * Room updateManyAndReturn
   */
  export type RoomUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * The data used to update Rooms.
     */
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyInput>
    /**
     * Filter which Rooms to update
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Room upsert
   */
  export type RoomUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The filter to search for the Room to update in case it exists.
     */
    where: RoomWhereUniqueInput
    /**
     * In case the Room found by the `where` argument doesn't exist, create a new Room with this data.
     */
    create: XOR<RoomCreateInput, RoomUncheckedCreateInput>
    /**
     * In case the Room was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RoomUpdateInput, RoomUncheckedUpdateInput>
  }

  /**
   * Room delete
   */
  export type RoomDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter which Room to delete.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room deleteMany
   */
  export type RoomDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Rooms to delete
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to delete.
     */
    limit?: number
  }

  /**
   * Room.captures
   */
  export type Room$capturesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    where?: CaptureWhereInput
    orderBy?: CaptureOrderByWithRelationInput | CaptureOrderByWithRelationInput[]
    cursor?: CaptureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CaptureScalarFieldEnum | CaptureScalarFieldEnum[]
  }

  /**
   * Room.items
   */
  export type Room$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    where?: InspectionItemWhereInput
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    cursor?: InspectionItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InspectionItemScalarFieldEnum | InspectionItemScalarFieldEnum[]
  }

  /**
   * Room without action
   */
  export type RoomDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
  }


  /**
   * Model InspectionItem
   */

  export type AggregateInspectionItem = {
    _count: InspectionItemCountAggregateOutputType | null
    _avg: InspectionItemAvgAggregateOutputType | null
    _sum: InspectionItemSumAggregateOutputType | null
    _min: InspectionItemMinAggregateOutputType | null
    _max: InspectionItemMaxAggregateOutputType | null
  }

  export type InspectionItemAvgAggregateOutputType = {
    quantity: number | null
    sourceTimestampSec: number | null
    confidence: number | null
  }

  export type InspectionItemSumAggregateOutputType = {
    quantity: number | null
    sourceTimestampSec: number | null
    confidence: number | null
  }

  export type InspectionItemMinAggregateOutputType = {
    id: string | null
    roomId: string | null
    name: string | null
    category: $Enums.ItemCategory | null
    condition: $Enums.ItemCondition | null
    quantity: number | null
    notes: string | null
    identifier: string | null
    meterReading: string | null
    sourceCaptureId: string | null
    sourceTimestampSec: number | null
    confidence: number | null
    editedByHuman: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InspectionItemMaxAggregateOutputType = {
    id: string | null
    roomId: string | null
    name: string | null
    category: $Enums.ItemCategory | null
    condition: $Enums.ItemCondition | null
    quantity: number | null
    notes: string | null
    identifier: string | null
    meterReading: string | null
    sourceCaptureId: string | null
    sourceTimestampSec: number | null
    confidence: number | null
    editedByHuman: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InspectionItemCountAggregateOutputType = {
    id: number
    roomId: number
    name: number
    category: number
    condition: number
    quantity: number
    notes: number
    identifier: number
    meterReading: number
    sourceCaptureId: number
    sourceTimestampSec: number
    confidence: number
    editedByHuman: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InspectionItemAvgAggregateInputType = {
    quantity?: true
    sourceTimestampSec?: true
    confidence?: true
  }

  export type InspectionItemSumAggregateInputType = {
    quantity?: true
    sourceTimestampSec?: true
    confidence?: true
  }

  export type InspectionItemMinAggregateInputType = {
    id?: true
    roomId?: true
    name?: true
    category?: true
    condition?: true
    quantity?: true
    notes?: true
    identifier?: true
    meterReading?: true
    sourceCaptureId?: true
    sourceTimestampSec?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InspectionItemMaxAggregateInputType = {
    id?: true
    roomId?: true
    name?: true
    category?: true
    condition?: true
    quantity?: true
    notes?: true
    identifier?: true
    meterReading?: true
    sourceCaptureId?: true
    sourceTimestampSec?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InspectionItemCountAggregateInputType = {
    id?: true
    roomId?: true
    name?: true
    category?: true
    condition?: true
    quantity?: true
    notes?: true
    identifier?: true
    meterReading?: true
    sourceCaptureId?: true
    sourceTimestampSec?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InspectionItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InspectionItem to aggregate.
     */
    where?: InspectionItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InspectionItems to fetch.
     */
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InspectionItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InspectionItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InspectionItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InspectionItems
    **/
    _count?: true | InspectionItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InspectionItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InspectionItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InspectionItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InspectionItemMaxAggregateInputType
  }

  export type GetInspectionItemAggregateType<T extends InspectionItemAggregateArgs> = {
        [P in keyof T & keyof AggregateInspectionItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInspectionItem[P]>
      : GetScalarType<T[P], AggregateInspectionItem[P]>
  }




  export type InspectionItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InspectionItemWhereInput
    orderBy?: InspectionItemOrderByWithAggregationInput | InspectionItemOrderByWithAggregationInput[]
    by: InspectionItemScalarFieldEnum[] | InspectionItemScalarFieldEnum
    having?: InspectionItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InspectionItemCountAggregateInputType | true
    _avg?: InspectionItemAvgAggregateInputType
    _sum?: InspectionItemSumAggregateInputType
    _min?: InspectionItemMinAggregateInputType
    _max?: InspectionItemMaxAggregateInputType
  }

  export type InspectionItemGroupByOutputType = {
    id: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity: number
    notes: string | null
    identifier: string | null
    meterReading: string | null
    sourceCaptureId: string | null
    sourceTimestampSec: number | null
    confidence: number | null
    editedByHuman: boolean
    createdAt: Date
    updatedAt: Date
    _count: InspectionItemCountAggregateOutputType | null
    _avg: InspectionItemAvgAggregateOutputType | null
    _sum: InspectionItemSumAggregateOutputType | null
    _min: InspectionItemMinAggregateOutputType | null
    _max: InspectionItemMaxAggregateOutputType | null
  }

  type GetInspectionItemGroupByPayload<T extends InspectionItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InspectionItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InspectionItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InspectionItemGroupByOutputType[P]>
            : GetScalarType<T[P], InspectionItemGroupByOutputType[P]>
        }
      >
    >


  export type InspectionItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    name?: boolean
    category?: boolean
    condition?: boolean
    quantity?: boolean
    notes?: boolean
    identifier?: boolean
    meterReading?: boolean
    sourceCaptureId?: boolean
    sourceTimestampSec?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
    findingsAsSubject?: boolean | InspectionItem$findingsAsSubjectArgs<ExtArgs>
    findingsAsBaseline?: boolean | InspectionItem$findingsAsBaselineArgs<ExtArgs>
    _count?: boolean | InspectionItemCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["inspectionItem"]>

  export type InspectionItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    name?: boolean
    category?: boolean
    condition?: boolean
    quantity?: boolean
    notes?: boolean
    identifier?: boolean
    meterReading?: boolean
    sourceCaptureId?: boolean
    sourceTimestampSec?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
  }, ExtArgs["result"]["inspectionItem"]>

  export type InspectionItemSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    name?: boolean
    category?: boolean
    condition?: boolean
    quantity?: boolean
    notes?: boolean
    identifier?: boolean
    meterReading?: boolean
    sourceCaptureId?: boolean
    sourceTimestampSec?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
  }, ExtArgs["result"]["inspectionItem"]>

  export type InspectionItemSelectScalar = {
    id?: boolean
    roomId?: boolean
    name?: boolean
    category?: boolean
    condition?: boolean
    quantity?: boolean
    notes?: boolean
    identifier?: boolean
    meterReading?: boolean
    sourceCaptureId?: boolean
    sourceTimestampSec?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InspectionItemOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "roomId" | "name" | "category" | "condition" | "quantity" | "notes" | "identifier" | "meterReading" | "sourceCaptureId" | "sourceTimestampSec" | "confidence" | "editedByHuman" | "createdAt" | "updatedAt", ExtArgs["result"]["inspectionItem"]>
  export type InspectionItemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
    findingsAsSubject?: boolean | InspectionItem$findingsAsSubjectArgs<ExtArgs>
    findingsAsBaseline?: boolean | InspectionItem$findingsAsBaselineArgs<ExtArgs>
    _count?: boolean | InspectionItemCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InspectionItemIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
  }
  export type InspectionItemIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    room?: boolean | RoomDefaultArgs<ExtArgs>
    sourceCapture?: boolean | InspectionItem$sourceCaptureArgs<ExtArgs>
  }

  export type $InspectionItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InspectionItem"
    objects: {
      room: Prisma.$RoomPayload<ExtArgs>
      sourceCapture: Prisma.$CapturePayload<ExtArgs> | null
      findingsAsSubject: Prisma.$FindingPayload<ExtArgs>[]
      findingsAsBaseline: Prisma.$FindingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      roomId: string
      name: string
      category: $Enums.ItemCategory
      condition: $Enums.ItemCondition
      quantity: number
      notes: string | null
      /**
       * Make, model, and serial read verbatim off a photographed label or plate.
       * This is what makes an inventory line identify one specific object rather than
       * a category of object. That difference is what decides a deposit dispute.
       */
      identifier: string | null
      /**
       * Meter reading, verbatim as spoken or read. Free text, because units vary.
       */
      meterReading: string | null
      /**
       * The capture this item was read from, so the report can show its evidence.
       */
      sourceCaptureId: string | null
      /**
       * Where in that capture the item is clearest. Video captures only.
       */
      sourceTimestampSec: number | null
      /**
       * Model self-reported confidence, 0–1. Null once a human has taken ownership.
       */
      confidence: number | null
      editedByHuman: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["inspectionItem"]>
    composites: {}
  }

  type InspectionItemGetPayload<S extends boolean | null | undefined | InspectionItemDefaultArgs> = $Result.GetResult<Prisma.$InspectionItemPayload, S>

  type InspectionItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InspectionItemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InspectionItemCountAggregateInputType | true
    }

  export interface InspectionItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InspectionItem'], meta: { name: 'InspectionItem' } }
    /**
     * Find zero or one InspectionItem that matches the filter.
     * @param {InspectionItemFindUniqueArgs} args - Arguments to find a InspectionItem
     * @example
     * // Get one InspectionItem
     * const inspectionItem = await prisma.inspectionItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InspectionItemFindUniqueArgs>(args: SelectSubset<T, InspectionItemFindUniqueArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one InspectionItem that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InspectionItemFindUniqueOrThrowArgs} args - Arguments to find a InspectionItem
     * @example
     * // Get one InspectionItem
     * const inspectionItem = await prisma.inspectionItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InspectionItemFindUniqueOrThrowArgs>(args: SelectSubset<T, InspectionItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InspectionItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemFindFirstArgs} args - Arguments to find a InspectionItem
     * @example
     * // Get one InspectionItem
     * const inspectionItem = await prisma.inspectionItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InspectionItemFindFirstArgs>(args?: SelectSubset<T, InspectionItemFindFirstArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InspectionItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemFindFirstOrThrowArgs} args - Arguments to find a InspectionItem
     * @example
     * // Get one InspectionItem
     * const inspectionItem = await prisma.inspectionItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InspectionItemFindFirstOrThrowArgs>(args?: SelectSubset<T, InspectionItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more InspectionItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InspectionItems
     * const inspectionItems = await prisma.inspectionItem.findMany()
     * 
     * // Get first 10 InspectionItems
     * const inspectionItems = await prisma.inspectionItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const inspectionItemWithIdOnly = await prisma.inspectionItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InspectionItemFindManyArgs>(args?: SelectSubset<T, InspectionItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a InspectionItem.
     * @param {InspectionItemCreateArgs} args - Arguments to create a InspectionItem.
     * @example
     * // Create one InspectionItem
     * const InspectionItem = await prisma.inspectionItem.create({
     *   data: {
     *     // ... data to create a InspectionItem
     *   }
     * })
     * 
     */
    create<T extends InspectionItemCreateArgs>(args: SelectSubset<T, InspectionItemCreateArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many InspectionItems.
     * @param {InspectionItemCreateManyArgs} args - Arguments to create many InspectionItems.
     * @example
     * // Create many InspectionItems
     * const inspectionItem = await prisma.inspectionItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InspectionItemCreateManyArgs>(args?: SelectSubset<T, InspectionItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InspectionItems and returns the data saved in the database.
     * @param {InspectionItemCreateManyAndReturnArgs} args - Arguments to create many InspectionItems.
     * @example
     * // Create many InspectionItems
     * const inspectionItem = await prisma.inspectionItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InspectionItems and only return the `id`
     * const inspectionItemWithIdOnly = await prisma.inspectionItem.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InspectionItemCreateManyAndReturnArgs>(args?: SelectSubset<T, InspectionItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a InspectionItem.
     * @param {InspectionItemDeleteArgs} args - Arguments to delete one InspectionItem.
     * @example
     * // Delete one InspectionItem
     * const InspectionItem = await prisma.inspectionItem.delete({
     *   where: {
     *     // ... filter to delete one InspectionItem
     *   }
     * })
     * 
     */
    delete<T extends InspectionItemDeleteArgs>(args: SelectSubset<T, InspectionItemDeleteArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one InspectionItem.
     * @param {InspectionItemUpdateArgs} args - Arguments to update one InspectionItem.
     * @example
     * // Update one InspectionItem
     * const inspectionItem = await prisma.inspectionItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InspectionItemUpdateArgs>(args: SelectSubset<T, InspectionItemUpdateArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more InspectionItems.
     * @param {InspectionItemDeleteManyArgs} args - Arguments to filter InspectionItems to delete.
     * @example
     * // Delete a few InspectionItems
     * const { count } = await prisma.inspectionItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InspectionItemDeleteManyArgs>(args?: SelectSubset<T, InspectionItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InspectionItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InspectionItems
     * const inspectionItem = await prisma.inspectionItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InspectionItemUpdateManyArgs>(args: SelectSubset<T, InspectionItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InspectionItems and returns the data updated in the database.
     * @param {InspectionItemUpdateManyAndReturnArgs} args - Arguments to update many InspectionItems.
     * @example
     * // Update many InspectionItems
     * const inspectionItem = await prisma.inspectionItem.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more InspectionItems and only return the `id`
     * const inspectionItemWithIdOnly = await prisma.inspectionItem.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InspectionItemUpdateManyAndReturnArgs>(args: SelectSubset<T, InspectionItemUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one InspectionItem.
     * @param {InspectionItemUpsertArgs} args - Arguments to update or create a InspectionItem.
     * @example
     * // Update or create a InspectionItem
     * const inspectionItem = await prisma.inspectionItem.upsert({
     *   create: {
     *     // ... data to create a InspectionItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InspectionItem we want to update
     *   }
     * })
     */
    upsert<T extends InspectionItemUpsertArgs>(args: SelectSubset<T, InspectionItemUpsertArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of InspectionItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemCountArgs} args - Arguments to filter InspectionItems to count.
     * @example
     * // Count the number of InspectionItems
     * const count = await prisma.inspectionItem.count({
     *   where: {
     *     // ... the filter for the InspectionItems we want to count
     *   }
     * })
    **/
    count<T extends InspectionItemCountArgs>(
      args?: Subset<T, InspectionItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InspectionItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InspectionItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InspectionItemAggregateArgs>(args: Subset<T, InspectionItemAggregateArgs>): Prisma.PrismaPromise<GetInspectionItemAggregateType<T>>

    /**
     * Group by InspectionItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InspectionItemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InspectionItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InspectionItemGroupByArgs['orderBy'] }
        : { orderBy?: InspectionItemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InspectionItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInspectionItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InspectionItem model
   */
  readonly fields: InspectionItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InspectionItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InspectionItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    room<T extends RoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RoomDefaultArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    sourceCapture<T extends InspectionItem$sourceCaptureArgs<ExtArgs> = {}>(args?: Subset<T, InspectionItem$sourceCaptureArgs<ExtArgs>>): Prisma__CaptureClient<$Result.GetResult<Prisma.$CapturePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    findingsAsSubject<T extends InspectionItem$findingsAsSubjectArgs<ExtArgs> = {}>(args?: Subset<T, InspectionItem$findingsAsSubjectArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    findingsAsBaseline<T extends InspectionItem$findingsAsBaselineArgs<ExtArgs> = {}>(args?: Subset<T, InspectionItem$findingsAsBaselineArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the InspectionItem model
   */
  interface InspectionItemFieldRefs {
    readonly id: FieldRef<"InspectionItem", 'String'>
    readonly roomId: FieldRef<"InspectionItem", 'String'>
    readonly name: FieldRef<"InspectionItem", 'String'>
    readonly category: FieldRef<"InspectionItem", 'ItemCategory'>
    readonly condition: FieldRef<"InspectionItem", 'ItemCondition'>
    readonly quantity: FieldRef<"InspectionItem", 'Int'>
    readonly notes: FieldRef<"InspectionItem", 'String'>
    readonly identifier: FieldRef<"InspectionItem", 'String'>
    readonly meterReading: FieldRef<"InspectionItem", 'String'>
    readonly sourceCaptureId: FieldRef<"InspectionItem", 'String'>
    readonly sourceTimestampSec: FieldRef<"InspectionItem", 'Int'>
    readonly confidence: FieldRef<"InspectionItem", 'Float'>
    readonly editedByHuman: FieldRef<"InspectionItem", 'Boolean'>
    readonly createdAt: FieldRef<"InspectionItem", 'DateTime'>
    readonly updatedAt: FieldRef<"InspectionItem", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * InspectionItem findUnique
   */
  export type InspectionItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter, which InspectionItem to fetch.
     */
    where: InspectionItemWhereUniqueInput
  }

  /**
   * InspectionItem findUniqueOrThrow
   */
  export type InspectionItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter, which InspectionItem to fetch.
     */
    where: InspectionItemWhereUniqueInput
  }

  /**
   * InspectionItem findFirst
   */
  export type InspectionItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter, which InspectionItem to fetch.
     */
    where?: InspectionItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InspectionItems to fetch.
     */
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InspectionItems.
     */
    cursor?: InspectionItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InspectionItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InspectionItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InspectionItems.
     */
    distinct?: InspectionItemScalarFieldEnum | InspectionItemScalarFieldEnum[]
  }

  /**
   * InspectionItem findFirstOrThrow
   */
  export type InspectionItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter, which InspectionItem to fetch.
     */
    where?: InspectionItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InspectionItems to fetch.
     */
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InspectionItems.
     */
    cursor?: InspectionItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InspectionItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InspectionItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InspectionItems.
     */
    distinct?: InspectionItemScalarFieldEnum | InspectionItemScalarFieldEnum[]
  }

  /**
   * InspectionItem findMany
   */
  export type InspectionItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter, which InspectionItems to fetch.
     */
    where?: InspectionItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InspectionItems to fetch.
     */
    orderBy?: InspectionItemOrderByWithRelationInput | InspectionItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InspectionItems.
     */
    cursor?: InspectionItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InspectionItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InspectionItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InspectionItems.
     */
    distinct?: InspectionItemScalarFieldEnum | InspectionItemScalarFieldEnum[]
  }

  /**
   * InspectionItem create
   */
  export type InspectionItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * The data needed to create a InspectionItem.
     */
    data: XOR<InspectionItemCreateInput, InspectionItemUncheckedCreateInput>
  }

  /**
   * InspectionItem createMany
   */
  export type InspectionItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InspectionItems.
     */
    data: InspectionItemCreateManyInput | InspectionItemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InspectionItem createManyAndReturn
   */
  export type InspectionItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * The data used to create many InspectionItems.
     */
    data: InspectionItemCreateManyInput | InspectionItemCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InspectionItem update
   */
  export type InspectionItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * The data needed to update a InspectionItem.
     */
    data: XOR<InspectionItemUpdateInput, InspectionItemUncheckedUpdateInput>
    /**
     * Choose, which InspectionItem to update.
     */
    where: InspectionItemWhereUniqueInput
  }

  /**
   * InspectionItem updateMany
   */
  export type InspectionItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InspectionItems.
     */
    data: XOR<InspectionItemUpdateManyMutationInput, InspectionItemUncheckedUpdateManyInput>
    /**
     * Filter which InspectionItems to update
     */
    where?: InspectionItemWhereInput
    /**
     * Limit how many InspectionItems to update.
     */
    limit?: number
  }

  /**
   * InspectionItem updateManyAndReturn
   */
  export type InspectionItemUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * The data used to update InspectionItems.
     */
    data: XOR<InspectionItemUpdateManyMutationInput, InspectionItemUncheckedUpdateManyInput>
    /**
     * Filter which InspectionItems to update
     */
    where?: InspectionItemWhereInput
    /**
     * Limit how many InspectionItems to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * InspectionItem upsert
   */
  export type InspectionItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * The filter to search for the InspectionItem to update in case it exists.
     */
    where: InspectionItemWhereUniqueInput
    /**
     * In case the InspectionItem found by the `where` argument doesn't exist, create a new InspectionItem with this data.
     */
    create: XOR<InspectionItemCreateInput, InspectionItemUncheckedCreateInput>
    /**
     * In case the InspectionItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InspectionItemUpdateInput, InspectionItemUncheckedUpdateInput>
  }

  /**
   * InspectionItem delete
   */
  export type InspectionItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    /**
     * Filter which InspectionItem to delete.
     */
    where: InspectionItemWhereUniqueInput
  }

  /**
   * InspectionItem deleteMany
   */
  export type InspectionItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InspectionItems to delete
     */
    where?: InspectionItemWhereInput
    /**
     * Limit how many InspectionItems to delete.
     */
    limit?: number
  }

  /**
   * InspectionItem.sourceCapture
   */
  export type InspectionItem$sourceCaptureArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Capture
     */
    select?: CaptureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Capture
     */
    omit?: CaptureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CaptureInclude<ExtArgs> | null
    where?: CaptureWhereInput
  }

  /**
   * InspectionItem.findingsAsSubject
   */
  export type InspectionItem$findingsAsSubjectArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    where?: FindingWhereInput
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    cursor?: FindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * InspectionItem.findingsAsBaseline
   */
  export type InspectionItem$findingsAsBaselineArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    where?: FindingWhereInput
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    cursor?: FindingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * InspectionItem without action
   */
  export type InspectionItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
  }


  /**
   * Model Finding
   */

  export type AggregateFinding = {
    _count: FindingCountAggregateOutputType | null
    _avg: FindingAvgAggregateOutputType | null
    _sum: FindingSumAggregateOutputType | null
    _min: FindingMinAggregateOutputType | null
    _max: FindingMaxAggregateOutputType | null
  }

  export type FindingAvgAggregateOutputType = {
    estimatedCost: Decimal | null
    confidence: number | null
  }

  export type FindingSumAggregateOutputType = {
    estimatedCost: Decimal | null
    confidence: number | null
  }

  export type FindingMinAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    itemId: string | null
    baselineItemId: string | null
    changeType: $Enums.ChangeType | null
    verdict: $Enums.Verdict | null
    rationale: string | null
    estimatedCost: Decimal | null
    confidence: number | null
    editedByHuman: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FindingMaxAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    itemId: string | null
    baselineItemId: string | null
    changeType: $Enums.ChangeType | null
    verdict: $Enums.Verdict | null
    rationale: string | null
    estimatedCost: Decimal | null
    confidence: number | null
    editedByHuman: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FindingCountAggregateOutputType = {
    id: number
    inspectionId: number
    itemId: number
    baselineItemId: number
    changeType: number
    verdict: number
    rationale: number
    estimatedCost: number
    confidence: number
    editedByHuman: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FindingAvgAggregateInputType = {
    estimatedCost?: true
    confidence?: true
  }

  export type FindingSumAggregateInputType = {
    estimatedCost?: true
    confidence?: true
  }

  export type FindingMinAggregateInputType = {
    id?: true
    inspectionId?: true
    itemId?: true
    baselineItemId?: true
    changeType?: true
    verdict?: true
    rationale?: true
    estimatedCost?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FindingMaxAggregateInputType = {
    id?: true
    inspectionId?: true
    itemId?: true
    baselineItemId?: true
    changeType?: true
    verdict?: true
    rationale?: true
    estimatedCost?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FindingCountAggregateInputType = {
    id?: true
    inspectionId?: true
    itemId?: true
    baselineItemId?: true
    changeType?: true
    verdict?: true
    rationale?: true
    estimatedCost?: true
    confidence?: true
    editedByHuman?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FindingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Finding to aggregate.
     */
    where?: FindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Findings to fetch.
     */
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Findings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Findings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Findings
    **/
    _count?: true | FindingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FindingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FindingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FindingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FindingMaxAggregateInputType
  }

  export type GetFindingAggregateType<T extends FindingAggregateArgs> = {
        [P in keyof T & keyof AggregateFinding]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFinding[P]>
      : GetScalarType<T[P], AggregateFinding[P]>
  }




  export type FindingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FindingWhereInput
    orderBy?: FindingOrderByWithAggregationInput | FindingOrderByWithAggregationInput[]
    by: FindingScalarFieldEnum[] | FindingScalarFieldEnum
    having?: FindingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FindingCountAggregateInputType | true
    _avg?: FindingAvgAggregateInputType
    _sum?: FindingSumAggregateInputType
    _min?: FindingMinAggregateInputType
    _max?: FindingMaxAggregateInputType
  }

  export type FindingGroupByOutputType = {
    id: string
    inspectionId: string
    itemId: string | null
    baselineItemId: string | null
    changeType: $Enums.ChangeType
    verdict: $Enums.Verdict
    rationale: string
    estimatedCost: Decimal | null
    confidence: number | null
    editedByHuman: boolean
    createdAt: Date
    updatedAt: Date
    _count: FindingCountAggregateOutputType | null
    _avg: FindingAvgAggregateOutputType | null
    _sum: FindingSumAggregateOutputType | null
    _min: FindingMinAggregateOutputType | null
    _max: FindingMaxAggregateOutputType | null
  }

  type GetFindingGroupByPayload<T extends FindingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FindingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FindingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FindingGroupByOutputType[P]>
            : GetScalarType<T[P], FindingGroupByOutputType[P]>
        }
      >
    >


  export type FindingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    itemId?: boolean
    baselineItemId?: boolean
    changeType?: boolean
    verdict?: boolean
    rationale?: boolean
    estimatedCost?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }, ExtArgs["result"]["finding"]>

  export type FindingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    itemId?: boolean
    baselineItemId?: boolean
    changeType?: boolean
    verdict?: boolean
    rationale?: boolean
    estimatedCost?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }, ExtArgs["result"]["finding"]>

  export type FindingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    itemId?: boolean
    baselineItemId?: boolean
    changeType?: boolean
    verdict?: boolean
    rationale?: boolean
    estimatedCost?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }, ExtArgs["result"]["finding"]>

  export type FindingSelectScalar = {
    id?: boolean
    inspectionId?: boolean
    itemId?: boolean
    baselineItemId?: boolean
    changeType?: boolean
    verdict?: boolean
    rationale?: boolean
    estimatedCost?: boolean
    confidence?: boolean
    editedByHuman?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FindingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "inspectionId" | "itemId" | "baselineItemId" | "changeType" | "verdict" | "rationale" | "estimatedCost" | "confidence" | "editedByHuman" | "createdAt" | "updatedAt", ExtArgs["result"]["finding"]>
  export type FindingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }
  export type FindingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }
  export type FindingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    item?: boolean | Finding$itemArgs<ExtArgs>
    baselineItem?: boolean | Finding$baselineItemArgs<ExtArgs>
  }

  export type $FindingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Finding"
    objects: {
      inspection: Prisma.$InspectionPayload<ExtArgs>
      item: Prisma.$InspectionItemPayload<ExtArgs> | null
      baselineItem: Prisma.$InspectionItemPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      inspectionId: string
      itemId: string | null
      baselineItemId: string | null
      changeType: $Enums.ChangeType
      verdict: $Enums.Verdict
      rationale: string
      estimatedCost: Prisma.Decimal | null
      confidence: number | null
      editedByHuman: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["finding"]>
    composites: {}
  }

  type FindingGetPayload<S extends boolean | null | undefined | FindingDefaultArgs> = $Result.GetResult<Prisma.$FindingPayload, S>

  type FindingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FindingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FindingCountAggregateInputType | true
    }

  export interface FindingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Finding'], meta: { name: 'Finding' } }
    /**
     * Find zero or one Finding that matches the filter.
     * @param {FindingFindUniqueArgs} args - Arguments to find a Finding
     * @example
     * // Get one Finding
     * const finding = await prisma.finding.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FindingFindUniqueArgs>(args: SelectSubset<T, FindingFindUniqueArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Finding that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FindingFindUniqueOrThrowArgs} args - Arguments to find a Finding
     * @example
     * // Get one Finding
     * const finding = await prisma.finding.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FindingFindUniqueOrThrowArgs>(args: SelectSubset<T, FindingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Finding that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingFindFirstArgs} args - Arguments to find a Finding
     * @example
     * // Get one Finding
     * const finding = await prisma.finding.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FindingFindFirstArgs>(args?: SelectSubset<T, FindingFindFirstArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Finding that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingFindFirstOrThrowArgs} args - Arguments to find a Finding
     * @example
     * // Get one Finding
     * const finding = await prisma.finding.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FindingFindFirstOrThrowArgs>(args?: SelectSubset<T, FindingFindFirstOrThrowArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Findings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Findings
     * const findings = await prisma.finding.findMany()
     * 
     * // Get first 10 Findings
     * const findings = await prisma.finding.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const findingWithIdOnly = await prisma.finding.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FindingFindManyArgs>(args?: SelectSubset<T, FindingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Finding.
     * @param {FindingCreateArgs} args - Arguments to create a Finding.
     * @example
     * // Create one Finding
     * const Finding = await prisma.finding.create({
     *   data: {
     *     // ... data to create a Finding
     *   }
     * })
     * 
     */
    create<T extends FindingCreateArgs>(args: SelectSubset<T, FindingCreateArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Findings.
     * @param {FindingCreateManyArgs} args - Arguments to create many Findings.
     * @example
     * // Create many Findings
     * const finding = await prisma.finding.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FindingCreateManyArgs>(args?: SelectSubset<T, FindingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Findings and returns the data saved in the database.
     * @param {FindingCreateManyAndReturnArgs} args - Arguments to create many Findings.
     * @example
     * // Create many Findings
     * const finding = await prisma.finding.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Findings and only return the `id`
     * const findingWithIdOnly = await prisma.finding.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FindingCreateManyAndReturnArgs>(args?: SelectSubset<T, FindingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Finding.
     * @param {FindingDeleteArgs} args - Arguments to delete one Finding.
     * @example
     * // Delete one Finding
     * const Finding = await prisma.finding.delete({
     *   where: {
     *     // ... filter to delete one Finding
     *   }
     * })
     * 
     */
    delete<T extends FindingDeleteArgs>(args: SelectSubset<T, FindingDeleteArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Finding.
     * @param {FindingUpdateArgs} args - Arguments to update one Finding.
     * @example
     * // Update one Finding
     * const finding = await prisma.finding.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FindingUpdateArgs>(args: SelectSubset<T, FindingUpdateArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Findings.
     * @param {FindingDeleteManyArgs} args - Arguments to filter Findings to delete.
     * @example
     * // Delete a few Findings
     * const { count } = await prisma.finding.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FindingDeleteManyArgs>(args?: SelectSubset<T, FindingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Findings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Findings
     * const finding = await prisma.finding.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FindingUpdateManyArgs>(args: SelectSubset<T, FindingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Findings and returns the data updated in the database.
     * @param {FindingUpdateManyAndReturnArgs} args - Arguments to update many Findings.
     * @example
     * // Update many Findings
     * const finding = await prisma.finding.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Findings and only return the `id`
     * const findingWithIdOnly = await prisma.finding.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FindingUpdateManyAndReturnArgs>(args: SelectSubset<T, FindingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Finding.
     * @param {FindingUpsertArgs} args - Arguments to update or create a Finding.
     * @example
     * // Update or create a Finding
     * const finding = await prisma.finding.upsert({
     *   create: {
     *     // ... data to create a Finding
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Finding we want to update
     *   }
     * })
     */
    upsert<T extends FindingUpsertArgs>(args: SelectSubset<T, FindingUpsertArgs<ExtArgs>>): Prisma__FindingClient<$Result.GetResult<Prisma.$FindingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Findings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingCountArgs} args - Arguments to filter Findings to count.
     * @example
     * // Count the number of Findings
     * const count = await prisma.finding.count({
     *   where: {
     *     // ... the filter for the Findings we want to count
     *   }
     * })
    **/
    count<T extends FindingCountArgs>(
      args?: Subset<T, FindingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FindingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Finding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FindingAggregateArgs>(args: Subset<T, FindingAggregateArgs>): Prisma.PrismaPromise<GetFindingAggregateType<T>>

    /**
     * Group by Finding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FindingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FindingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FindingGroupByArgs['orderBy'] }
        : { orderBy?: FindingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FindingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFindingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Finding model
   */
  readonly fields: FindingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Finding.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FindingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    inspection<T extends InspectionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InspectionDefaultArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    item<T extends Finding$itemArgs<ExtArgs> = {}>(args?: Subset<T, Finding$itemArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    baselineItem<T extends Finding$baselineItemArgs<ExtArgs> = {}>(args?: Subset<T, Finding$baselineItemArgs<ExtArgs>>): Prisma__InspectionItemClient<$Result.GetResult<Prisma.$InspectionItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Finding model
   */
  interface FindingFieldRefs {
    readonly id: FieldRef<"Finding", 'String'>
    readonly inspectionId: FieldRef<"Finding", 'String'>
    readonly itemId: FieldRef<"Finding", 'String'>
    readonly baselineItemId: FieldRef<"Finding", 'String'>
    readonly changeType: FieldRef<"Finding", 'ChangeType'>
    readonly verdict: FieldRef<"Finding", 'Verdict'>
    readonly rationale: FieldRef<"Finding", 'String'>
    readonly estimatedCost: FieldRef<"Finding", 'Decimal'>
    readonly confidence: FieldRef<"Finding", 'Float'>
    readonly editedByHuman: FieldRef<"Finding", 'Boolean'>
    readonly createdAt: FieldRef<"Finding", 'DateTime'>
    readonly updatedAt: FieldRef<"Finding", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Finding findUnique
   */
  export type FindingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter, which Finding to fetch.
     */
    where: FindingWhereUniqueInput
  }

  /**
   * Finding findUniqueOrThrow
   */
  export type FindingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter, which Finding to fetch.
     */
    where: FindingWhereUniqueInput
  }

  /**
   * Finding findFirst
   */
  export type FindingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter, which Finding to fetch.
     */
    where?: FindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Findings to fetch.
     */
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Findings.
     */
    cursor?: FindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Findings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Findings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Findings.
     */
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * Finding findFirstOrThrow
   */
  export type FindingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter, which Finding to fetch.
     */
    where?: FindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Findings to fetch.
     */
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Findings.
     */
    cursor?: FindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Findings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Findings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Findings.
     */
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * Finding findMany
   */
  export type FindingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter, which Findings to fetch.
     */
    where?: FindingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Findings to fetch.
     */
    orderBy?: FindingOrderByWithRelationInput | FindingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Findings.
     */
    cursor?: FindingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Findings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Findings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Findings.
     */
    distinct?: FindingScalarFieldEnum | FindingScalarFieldEnum[]
  }

  /**
   * Finding create
   */
  export type FindingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * The data needed to create a Finding.
     */
    data: XOR<FindingCreateInput, FindingUncheckedCreateInput>
  }

  /**
   * Finding createMany
   */
  export type FindingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Findings.
     */
    data: FindingCreateManyInput | FindingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Finding createManyAndReturn
   */
  export type FindingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * The data used to create many Findings.
     */
    data: FindingCreateManyInput | FindingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Finding update
   */
  export type FindingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * The data needed to update a Finding.
     */
    data: XOR<FindingUpdateInput, FindingUncheckedUpdateInput>
    /**
     * Choose, which Finding to update.
     */
    where: FindingWhereUniqueInput
  }

  /**
   * Finding updateMany
   */
  export type FindingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Findings.
     */
    data: XOR<FindingUpdateManyMutationInput, FindingUncheckedUpdateManyInput>
    /**
     * Filter which Findings to update
     */
    where?: FindingWhereInput
    /**
     * Limit how many Findings to update.
     */
    limit?: number
  }

  /**
   * Finding updateManyAndReturn
   */
  export type FindingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * The data used to update Findings.
     */
    data: XOR<FindingUpdateManyMutationInput, FindingUncheckedUpdateManyInput>
    /**
     * Filter which Findings to update
     */
    where?: FindingWhereInput
    /**
     * Limit how many Findings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Finding upsert
   */
  export type FindingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * The filter to search for the Finding to update in case it exists.
     */
    where: FindingWhereUniqueInput
    /**
     * In case the Finding found by the `where` argument doesn't exist, create a new Finding with this data.
     */
    create: XOR<FindingCreateInput, FindingUncheckedCreateInput>
    /**
     * In case the Finding was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FindingUpdateInput, FindingUncheckedUpdateInput>
  }

  /**
   * Finding delete
   */
  export type FindingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
    /**
     * Filter which Finding to delete.
     */
    where: FindingWhereUniqueInput
  }

  /**
   * Finding deleteMany
   */
  export type FindingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Findings to delete
     */
    where?: FindingWhereInput
    /**
     * Limit how many Findings to delete.
     */
    limit?: number
  }

  /**
   * Finding.item
   */
  export type Finding$itemArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    where?: InspectionItemWhereInput
  }

  /**
   * Finding.baselineItem
   */
  export type Finding$baselineItemArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InspectionItem
     */
    select?: InspectionItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InspectionItem
     */
    omit?: InspectionItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InspectionItemInclude<ExtArgs> | null
    where?: InspectionItemWhereInput
  }

  /**
   * Finding without action
   */
  export type FindingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Finding
     */
    select?: FindingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Finding
     */
    omit?: FindingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FindingInclude<ExtArgs> | null
  }


  /**
   * Model Signature
   */

  export type AggregateSignature = {
    _count: SignatureCountAggregateOutputType | null
    _min: SignatureMinAggregateOutputType | null
    _max: SignatureMaxAggregateOutputType | null
  }

  export type SignatureMinAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    stakeholderId: string | null
    signedAt: Date | null
    ipAddress: string | null
    imageData: string | null
  }

  export type SignatureMaxAggregateOutputType = {
    id: string | null
    inspectionId: string | null
    stakeholderId: string | null
    signedAt: Date | null
    ipAddress: string | null
    imageData: string | null
  }

  export type SignatureCountAggregateOutputType = {
    id: number
    inspectionId: number
    stakeholderId: number
    signedAt: number
    ipAddress: number
    imageData: number
    _all: number
  }


  export type SignatureMinAggregateInputType = {
    id?: true
    inspectionId?: true
    stakeholderId?: true
    signedAt?: true
    ipAddress?: true
    imageData?: true
  }

  export type SignatureMaxAggregateInputType = {
    id?: true
    inspectionId?: true
    stakeholderId?: true
    signedAt?: true
    ipAddress?: true
    imageData?: true
  }

  export type SignatureCountAggregateInputType = {
    id?: true
    inspectionId?: true
    stakeholderId?: true
    signedAt?: true
    ipAddress?: true
    imageData?: true
    _all?: true
  }

  export type SignatureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Signature to aggregate.
     */
    where?: SignatureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Signatures to fetch.
     */
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SignatureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Signatures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Signatures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Signatures
    **/
    _count?: true | SignatureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SignatureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SignatureMaxAggregateInputType
  }

  export type GetSignatureAggregateType<T extends SignatureAggregateArgs> = {
        [P in keyof T & keyof AggregateSignature]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSignature[P]>
      : GetScalarType<T[P], AggregateSignature[P]>
  }




  export type SignatureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SignatureWhereInput
    orderBy?: SignatureOrderByWithAggregationInput | SignatureOrderByWithAggregationInput[]
    by: SignatureScalarFieldEnum[] | SignatureScalarFieldEnum
    having?: SignatureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SignatureCountAggregateInputType | true
    _min?: SignatureMinAggregateInputType
    _max?: SignatureMaxAggregateInputType
  }

  export type SignatureGroupByOutputType = {
    id: string
    inspectionId: string
    stakeholderId: string
    signedAt: Date
    ipAddress: string | null
    imageData: string
    _count: SignatureCountAggregateOutputType | null
    _min: SignatureMinAggregateOutputType | null
    _max: SignatureMaxAggregateOutputType | null
  }

  type GetSignatureGroupByPayload<T extends SignatureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SignatureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SignatureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SignatureGroupByOutputType[P]>
            : GetScalarType<T[P], SignatureGroupByOutputType[P]>
        }
      >
    >


  export type SignatureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    stakeholderId?: boolean
    signedAt?: boolean
    ipAddress?: boolean
    imageData?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["signature"]>

  export type SignatureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    stakeholderId?: boolean
    signedAt?: boolean
    ipAddress?: boolean
    imageData?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["signature"]>

  export type SignatureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    inspectionId?: boolean
    stakeholderId?: boolean
    signedAt?: boolean
    ipAddress?: boolean
    imageData?: boolean
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["signature"]>

  export type SignatureSelectScalar = {
    id?: boolean
    inspectionId?: boolean
    stakeholderId?: boolean
    signedAt?: boolean
    ipAddress?: boolean
    imageData?: boolean
  }

  export type SignatureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "inspectionId" | "stakeholderId" | "signedAt" | "ipAddress" | "imageData", ExtArgs["result"]["signature"]>
  export type SignatureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }
  export type SignatureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }
  export type SignatureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    inspection?: boolean | InspectionDefaultArgs<ExtArgs>
    stakeholder?: boolean | StakeholderDefaultArgs<ExtArgs>
  }

  export type $SignaturePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Signature"
    objects: {
      inspection: Prisma.$InspectionPayload<ExtArgs>
      stakeholder: Prisma.$StakeholderPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      inspectionId: string
      stakeholderId: string
      signedAt: Date
      ipAddress: string | null
      /**
       * data: URL of the drawn signature.
       */
      imageData: string
    }, ExtArgs["result"]["signature"]>
    composites: {}
  }

  type SignatureGetPayload<S extends boolean | null | undefined | SignatureDefaultArgs> = $Result.GetResult<Prisma.$SignaturePayload, S>

  type SignatureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SignatureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SignatureCountAggregateInputType | true
    }

  export interface SignatureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Signature'], meta: { name: 'Signature' } }
    /**
     * Find zero or one Signature that matches the filter.
     * @param {SignatureFindUniqueArgs} args - Arguments to find a Signature
     * @example
     * // Get one Signature
     * const signature = await prisma.signature.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SignatureFindUniqueArgs>(args: SelectSubset<T, SignatureFindUniqueArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Signature that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SignatureFindUniqueOrThrowArgs} args - Arguments to find a Signature
     * @example
     * // Get one Signature
     * const signature = await prisma.signature.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SignatureFindUniqueOrThrowArgs>(args: SelectSubset<T, SignatureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Signature that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureFindFirstArgs} args - Arguments to find a Signature
     * @example
     * // Get one Signature
     * const signature = await prisma.signature.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SignatureFindFirstArgs>(args?: SelectSubset<T, SignatureFindFirstArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Signature that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureFindFirstOrThrowArgs} args - Arguments to find a Signature
     * @example
     * // Get one Signature
     * const signature = await prisma.signature.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SignatureFindFirstOrThrowArgs>(args?: SelectSubset<T, SignatureFindFirstOrThrowArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Signatures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Signatures
     * const signatures = await prisma.signature.findMany()
     * 
     * // Get first 10 Signatures
     * const signatures = await prisma.signature.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const signatureWithIdOnly = await prisma.signature.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SignatureFindManyArgs>(args?: SelectSubset<T, SignatureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Signature.
     * @param {SignatureCreateArgs} args - Arguments to create a Signature.
     * @example
     * // Create one Signature
     * const Signature = await prisma.signature.create({
     *   data: {
     *     // ... data to create a Signature
     *   }
     * })
     * 
     */
    create<T extends SignatureCreateArgs>(args: SelectSubset<T, SignatureCreateArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Signatures.
     * @param {SignatureCreateManyArgs} args - Arguments to create many Signatures.
     * @example
     * // Create many Signatures
     * const signature = await prisma.signature.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SignatureCreateManyArgs>(args?: SelectSubset<T, SignatureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Signatures and returns the data saved in the database.
     * @param {SignatureCreateManyAndReturnArgs} args - Arguments to create many Signatures.
     * @example
     * // Create many Signatures
     * const signature = await prisma.signature.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Signatures and only return the `id`
     * const signatureWithIdOnly = await prisma.signature.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SignatureCreateManyAndReturnArgs>(args?: SelectSubset<T, SignatureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Signature.
     * @param {SignatureDeleteArgs} args - Arguments to delete one Signature.
     * @example
     * // Delete one Signature
     * const Signature = await prisma.signature.delete({
     *   where: {
     *     // ... filter to delete one Signature
     *   }
     * })
     * 
     */
    delete<T extends SignatureDeleteArgs>(args: SelectSubset<T, SignatureDeleteArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Signature.
     * @param {SignatureUpdateArgs} args - Arguments to update one Signature.
     * @example
     * // Update one Signature
     * const signature = await prisma.signature.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SignatureUpdateArgs>(args: SelectSubset<T, SignatureUpdateArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Signatures.
     * @param {SignatureDeleteManyArgs} args - Arguments to filter Signatures to delete.
     * @example
     * // Delete a few Signatures
     * const { count } = await prisma.signature.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SignatureDeleteManyArgs>(args?: SelectSubset<T, SignatureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Signatures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Signatures
     * const signature = await prisma.signature.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SignatureUpdateManyArgs>(args: SelectSubset<T, SignatureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Signatures and returns the data updated in the database.
     * @param {SignatureUpdateManyAndReturnArgs} args - Arguments to update many Signatures.
     * @example
     * // Update many Signatures
     * const signature = await prisma.signature.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Signatures and only return the `id`
     * const signatureWithIdOnly = await prisma.signature.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SignatureUpdateManyAndReturnArgs>(args: SelectSubset<T, SignatureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Signature.
     * @param {SignatureUpsertArgs} args - Arguments to update or create a Signature.
     * @example
     * // Update or create a Signature
     * const signature = await prisma.signature.upsert({
     *   create: {
     *     // ... data to create a Signature
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Signature we want to update
     *   }
     * })
     */
    upsert<T extends SignatureUpsertArgs>(args: SelectSubset<T, SignatureUpsertArgs<ExtArgs>>): Prisma__SignatureClient<$Result.GetResult<Prisma.$SignaturePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Signatures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureCountArgs} args - Arguments to filter Signatures to count.
     * @example
     * // Count the number of Signatures
     * const count = await prisma.signature.count({
     *   where: {
     *     // ... the filter for the Signatures we want to count
     *   }
     * })
    **/
    count<T extends SignatureCountArgs>(
      args?: Subset<T, SignatureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SignatureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Signature.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SignatureAggregateArgs>(args: Subset<T, SignatureAggregateArgs>): Prisma.PrismaPromise<GetSignatureAggregateType<T>>

    /**
     * Group by Signature.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignatureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SignatureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SignatureGroupByArgs['orderBy'] }
        : { orderBy?: SignatureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SignatureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSignatureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Signature model
   */
  readonly fields: SignatureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Signature.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SignatureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    inspection<T extends InspectionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InspectionDefaultArgs<ExtArgs>>): Prisma__InspectionClient<$Result.GetResult<Prisma.$InspectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    stakeholder<T extends StakeholderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StakeholderDefaultArgs<ExtArgs>>): Prisma__StakeholderClient<$Result.GetResult<Prisma.$StakeholderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Signature model
   */
  interface SignatureFieldRefs {
    readonly id: FieldRef<"Signature", 'String'>
    readonly inspectionId: FieldRef<"Signature", 'String'>
    readonly stakeholderId: FieldRef<"Signature", 'String'>
    readonly signedAt: FieldRef<"Signature", 'DateTime'>
    readonly ipAddress: FieldRef<"Signature", 'String'>
    readonly imageData: FieldRef<"Signature", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Signature findUnique
   */
  export type SignatureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter, which Signature to fetch.
     */
    where: SignatureWhereUniqueInput
  }

  /**
   * Signature findUniqueOrThrow
   */
  export type SignatureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter, which Signature to fetch.
     */
    where: SignatureWhereUniqueInput
  }

  /**
   * Signature findFirst
   */
  export type SignatureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter, which Signature to fetch.
     */
    where?: SignatureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Signatures to fetch.
     */
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Signatures.
     */
    cursor?: SignatureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Signatures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Signatures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Signatures.
     */
    distinct?: SignatureScalarFieldEnum | SignatureScalarFieldEnum[]
  }

  /**
   * Signature findFirstOrThrow
   */
  export type SignatureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter, which Signature to fetch.
     */
    where?: SignatureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Signatures to fetch.
     */
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Signatures.
     */
    cursor?: SignatureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Signatures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Signatures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Signatures.
     */
    distinct?: SignatureScalarFieldEnum | SignatureScalarFieldEnum[]
  }

  /**
   * Signature findMany
   */
  export type SignatureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter, which Signatures to fetch.
     */
    where?: SignatureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Signatures to fetch.
     */
    orderBy?: SignatureOrderByWithRelationInput | SignatureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Signatures.
     */
    cursor?: SignatureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Signatures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Signatures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Signatures.
     */
    distinct?: SignatureScalarFieldEnum | SignatureScalarFieldEnum[]
  }

  /**
   * Signature create
   */
  export type SignatureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * The data needed to create a Signature.
     */
    data: XOR<SignatureCreateInput, SignatureUncheckedCreateInput>
  }

  /**
   * Signature createMany
   */
  export type SignatureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Signatures.
     */
    data: SignatureCreateManyInput | SignatureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Signature createManyAndReturn
   */
  export type SignatureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * The data used to create many Signatures.
     */
    data: SignatureCreateManyInput | SignatureCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Signature update
   */
  export type SignatureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * The data needed to update a Signature.
     */
    data: XOR<SignatureUpdateInput, SignatureUncheckedUpdateInput>
    /**
     * Choose, which Signature to update.
     */
    where: SignatureWhereUniqueInput
  }

  /**
   * Signature updateMany
   */
  export type SignatureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Signatures.
     */
    data: XOR<SignatureUpdateManyMutationInput, SignatureUncheckedUpdateManyInput>
    /**
     * Filter which Signatures to update
     */
    where?: SignatureWhereInput
    /**
     * Limit how many Signatures to update.
     */
    limit?: number
  }

  /**
   * Signature updateManyAndReturn
   */
  export type SignatureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * The data used to update Signatures.
     */
    data: XOR<SignatureUpdateManyMutationInput, SignatureUncheckedUpdateManyInput>
    /**
     * Filter which Signatures to update
     */
    where?: SignatureWhereInput
    /**
     * Limit how many Signatures to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Signature upsert
   */
  export type SignatureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * The filter to search for the Signature to update in case it exists.
     */
    where: SignatureWhereUniqueInput
    /**
     * In case the Signature found by the `where` argument doesn't exist, create a new Signature with this data.
     */
    create: XOR<SignatureCreateInput, SignatureUncheckedCreateInput>
    /**
     * In case the Signature was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SignatureUpdateInput, SignatureUncheckedUpdateInput>
  }

  /**
   * Signature delete
   */
  export type SignatureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
    /**
     * Filter which Signature to delete.
     */
    where: SignatureWhereUniqueInput
  }

  /**
   * Signature deleteMany
   */
  export type SignatureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Signatures to delete
     */
    where?: SignatureWhereInput
    /**
     * Limit how many Signatures to delete.
     */
    limit?: number
  }

  /**
   * Signature without action
   */
  export type SignatureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Signature
     */
    select?: SignatureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Signature
     */
    omit?: SignatureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SignatureInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const StakeholderScalarFieldEnum: {
    id: 'id',
    kind: 'kind',
    name: 'name',
    idNumber: 'idNumber',
    email: 'email',
    phone: 'phone',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type StakeholderScalarFieldEnum = (typeof StakeholderScalarFieldEnum)[keyof typeof StakeholderScalarFieldEnum]


  export const PropertyScalarFieldEnum: {
    id: 'id',
    line1: 'line1',
    unit: 'unit',
    postalCode: 'postalCode',
    type: 'type',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PropertyScalarFieldEnum = (typeof PropertyScalarFieldEnum)[keyof typeof PropertyScalarFieldEnum]


  export const TenancyScalarFieldEnum: {
    id: 'id',
    propertyId: 'propertyId',
    landlordId: 'landlordId',
    tenantId: 'tenantId',
    agentId: 'agentId',
    startDate: 'startDate',
    endDate: 'endDate',
    monthlyRent: 'monthlyRent',
    deposit: 'deposit',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TenancyScalarFieldEnum = (typeof TenancyScalarFieldEnum)[keyof typeof TenancyScalarFieldEnum]


  export const InspectionScalarFieldEnum: {
    id: 'id',
    tenancyId: 'tenancyId',
    kind: 'kind',
    status: 'status',
    conductedById: 'conductedById',
    conductedAt: 'conductedAt',
    baselineId: 'baselineId',
    summary: 'summary',
    processingError: 'processingError',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type InspectionScalarFieldEnum = (typeof InspectionScalarFieldEnum)[keyof typeof InspectionScalarFieldEnum]


  export const CaptureScalarFieldEnum: {
    id: 'id',
    roomId: 'roomId',
    kind: 'kind',
    storagePath: 'storagePath',
    mimeType: 'mimeType',
    sizeBytes: 'sizeBytes',
    durationSec: 'durationSec',
    transcript: 'transcript',
    note: 'note',
    processedAt: 'processedAt',
    createdAt: 'createdAt'
  };

  export type CaptureScalarFieldEnum = (typeof CaptureScalarFieldEnum)[keyof typeof CaptureScalarFieldEnum]


  export const RoomScalarFieldEnum: {
    id: 'id',
    inspectionId: 'inspectionId',
    name: 'name',
    order: 'order',
    status: 'status',
    processingError: 'processingError',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RoomScalarFieldEnum = (typeof RoomScalarFieldEnum)[keyof typeof RoomScalarFieldEnum]


  export const InspectionItemScalarFieldEnum: {
    id: 'id',
    roomId: 'roomId',
    name: 'name',
    category: 'category',
    condition: 'condition',
    quantity: 'quantity',
    notes: 'notes',
    identifier: 'identifier',
    meterReading: 'meterReading',
    sourceCaptureId: 'sourceCaptureId',
    sourceTimestampSec: 'sourceTimestampSec',
    confidence: 'confidence',
    editedByHuman: 'editedByHuman',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type InspectionItemScalarFieldEnum = (typeof InspectionItemScalarFieldEnum)[keyof typeof InspectionItemScalarFieldEnum]


  export const FindingScalarFieldEnum: {
    id: 'id',
    inspectionId: 'inspectionId',
    itemId: 'itemId',
    baselineItemId: 'baselineItemId',
    changeType: 'changeType',
    verdict: 'verdict',
    rationale: 'rationale',
    estimatedCost: 'estimatedCost',
    confidence: 'confidence',
    editedByHuman: 'editedByHuman',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FindingScalarFieldEnum = (typeof FindingScalarFieldEnum)[keyof typeof FindingScalarFieldEnum]


  export const SignatureScalarFieldEnum: {
    id: 'id',
    inspectionId: 'inspectionId',
    stakeholderId: 'stakeholderId',
    signedAt: 'signedAt',
    ipAddress: 'ipAddress',
    imageData: 'imageData'
  };

  export type SignatureScalarFieldEnum = (typeof SignatureScalarFieldEnum)[keyof typeof SignatureScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'StakeholderKind'
   */
  export type EnumStakeholderKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StakeholderKind'>
    


  /**
   * Reference to a field of type 'StakeholderKind[]'
   */
  export type ListEnumStakeholderKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'StakeholderKind[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'PropertyType'
   */
  export type EnumPropertyTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PropertyType'>
    


  /**
   * Reference to a field of type 'PropertyType[]'
   */
  export type ListEnumPropertyTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PropertyType[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'InspectionKind'
   */
  export type EnumInspectionKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InspectionKind'>
    


  /**
   * Reference to a field of type 'InspectionKind[]'
   */
  export type ListEnumInspectionKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InspectionKind[]'>
    


  /**
   * Reference to a field of type 'InspectionStatus'
   */
  export type EnumInspectionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InspectionStatus'>
    


  /**
   * Reference to a field of type 'InspectionStatus[]'
   */
  export type ListEnumInspectionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InspectionStatus[]'>
    


  /**
   * Reference to a field of type 'CaptureKind'
   */
  export type EnumCaptureKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CaptureKind'>
    


  /**
   * Reference to a field of type 'CaptureKind[]'
   */
  export type ListEnumCaptureKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CaptureKind[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'RoomStatus'
   */
  export type EnumRoomStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RoomStatus'>
    


  /**
   * Reference to a field of type 'RoomStatus[]'
   */
  export type ListEnumRoomStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RoomStatus[]'>
    


  /**
   * Reference to a field of type 'ItemCategory'
   */
  export type EnumItemCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemCategory'>
    


  /**
   * Reference to a field of type 'ItemCategory[]'
   */
  export type ListEnumItemCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemCategory[]'>
    


  /**
   * Reference to a field of type 'ItemCondition'
   */
  export type EnumItemConditionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemCondition'>
    


  /**
   * Reference to a field of type 'ItemCondition[]'
   */
  export type ListEnumItemConditionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemCondition[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'ChangeType'
   */
  export type EnumChangeTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ChangeType'>
    


  /**
   * Reference to a field of type 'ChangeType[]'
   */
  export type ListEnumChangeTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ChangeType[]'>
    


  /**
   * Reference to a field of type 'Verdict'
   */
  export type EnumVerdictFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Verdict'>
    


  /**
   * Reference to a field of type 'Verdict[]'
   */
  export type ListEnumVerdictFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Verdict[]'>
    
  /**
   * Deep Input Types
   */


  export type StakeholderWhereInput = {
    AND?: StakeholderWhereInput | StakeholderWhereInput[]
    OR?: StakeholderWhereInput[]
    NOT?: StakeholderWhereInput | StakeholderWhereInput[]
    id?: StringFilter<"Stakeholder"> | string
    kind?: EnumStakeholderKindFilter<"Stakeholder"> | $Enums.StakeholderKind
    name?: StringFilter<"Stakeholder"> | string
    idNumber?: StringNullableFilter<"Stakeholder"> | string | null
    email?: StringNullableFilter<"Stakeholder"> | string | null
    phone?: StringNullableFilter<"Stakeholder"> | string | null
    createdAt?: DateTimeFilter<"Stakeholder"> | Date | string
    updatedAt?: DateTimeFilter<"Stakeholder"> | Date | string
    tenanciesAsLandlord?: TenancyListRelationFilter
    tenanciesAsTenant?: TenancyListRelationFilter
    tenanciesAsAgent?: TenancyListRelationFilter
    inspectionsRun?: InspectionListRelationFilter
    signatures?: SignatureListRelationFilter
  }

  export type StakeholderOrderByWithRelationInput = {
    id?: SortOrder
    kind?: SortOrder
    name?: SortOrder
    idNumber?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenanciesAsLandlord?: TenancyOrderByRelationAggregateInput
    tenanciesAsTenant?: TenancyOrderByRelationAggregateInput
    tenanciesAsAgent?: TenancyOrderByRelationAggregateInput
    inspectionsRun?: InspectionOrderByRelationAggregateInput
    signatures?: SignatureOrderByRelationAggregateInput
  }

  export type StakeholderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: StakeholderWhereInput | StakeholderWhereInput[]
    OR?: StakeholderWhereInput[]
    NOT?: StakeholderWhereInput | StakeholderWhereInput[]
    kind?: EnumStakeholderKindFilter<"Stakeholder"> | $Enums.StakeholderKind
    name?: StringFilter<"Stakeholder"> | string
    idNumber?: StringNullableFilter<"Stakeholder"> | string | null
    email?: StringNullableFilter<"Stakeholder"> | string | null
    phone?: StringNullableFilter<"Stakeholder"> | string | null
    createdAt?: DateTimeFilter<"Stakeholder"> | Date | string
    updatedAt?: DateTimeFilter<"Stakeholder"> | Date | string
    tenanciesAsLandlord?: TenancyListRelationFilter
    tenanciesAsTenant?: TenancyListRelationFilter
    tenanciesAsAgent?: TenancyListRelationFilter
    inspectionsRun?: InspectionListRelationFilter
    signatures?: SignatureListRelationFilter
  }, "id">

  export type StakeholderOrderByWithAggregationInput = {
    id?: SortOrder
    kind?: SortOrder
    name?: SortOrder
    idNumber?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: StakeholderCountOrderByAggregateInput
    _max?: StakeholderMaxOrderByAggregateInput
    _min?: StakeholderMinOrderByAggregateInput
  }

  export type StakeholderScalarWhereWithAggregatesInput = {
    AND?: StakeholderScalarWhereWithAggregatesInput | StakeholderScalarWhereWithAggregatesInput[]
    OR?: StakeholderScalarWhereWithAggregatesInput[]
    NOT?: StakeholderScalarWhereWithAggregatesInput | StakeholderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Stakeholder"> | string
    kind?: EnumStakeholderKindWithAggregatesFilter<"Stakeholder"> | $Enums.StakeholderKind
    name?: StringWithAggregatesFilter<"Stakeholder"> | string
    idNumber?: StringNullableWithAggregatesFilter<"Stakeholder"> | string | null
    email?: StringNullableWithAggregatesFilter<"Stakeholder"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Stakeholder"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Stakeholder"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Stakeholder"> | Date | string
  }

  export type PropertyWhereInput = {
    AND?: PropertyWhereInput | PropertyWhereInput[]
    OR?: PropertyWhereInput[]
    NOT?: PropertyWhereInput | PropertyWhereInput[]
    id?: StringFilter<"Property"> | string
    line1?: StringFilter<"Property"> | string
    unit?: StringNullableFilter<"Property"> | string | null
    postalCode?: StringFilter<"Property"> | string
    type?: EnumPropertyTypeFilter<"Property"> | $Enums.PropertyType
    createdAt?: DateTimeFilter<"Property"> | Date | string
    updatedAt?: DateTimeFilter<"Property"> | Date | string
    tenancies?: TenancyListRelationFilter
  }

  export type PropertyOrderByWithRelationInput = {
    id?: SortOrder
    line1?: SortOrder
    unit?: SortOrderInput | SortOrder
    postalCode?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenancies?: TenancyOrderByRelationAggregateInput
  }

  export type PropertyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PropertyWhereInput | PropertyWhereInput[]
    OR?: PropertyWhereInput[]
    NOT?: PropertyWhereInput | PropertyWhereInput[]
    line1?: StringFilter<"Property"> | string
    unit?: StringNullableFilter<"Property"> | string | null
    postalCode?: StringFilter<"Property"> | string
    type?: EnumPropertyTypeFilter<"Property"> | $Enums.PropertyType
    createdAt?: DateTimeFilter<"Property"> | Date | string
    updatedAt?: DateTimeFilter<"Property"> | Date | string
    tenancies?: TenancyListRelationFilter
  }, "id">

  export type PropertyOrderByWithAggregationInput = {
    id?: SortOrder
    line1?: SortOrder
    unit?: SortOrderInput | SortOrder
    postalCode?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PropertyCountOrderByAggregateInput
    _max?: PropertyMaxOrderByAggregateInput
    _min?: PropertyMinOrderByAggregateInput
  }

  export type PropertyScalarWhereWithAggregatesInput = {
    AND?: PropertyScalarWhereWithAggregatesInput | PropertyScalarWhereWithAggregatesInput[]
    OR?: PropertyScalarWhereWithAggregatesInput[]
    NOT?: PropertyScalarWhereWithAggregatesInput | PropertyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Property"> | string
    line1?: StringWithAggregatesFilter<"Property"> | string
    unit?: StringNullableWithAggregatesFilter<"Property"> | string | null
    postalCode?: StringWithAggregatesFilter<"Property"> | string
    type?: EnumPropertyTypeWithAggregatesFilter<"Property"> | $Enums.PropertyType
    createdAt?: DateTimeWithAggregatesFilter<"Property"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Property"> | Date | string
  }

  export type TenancyWhereInput = {
    AND?: TenancyWhereInput | TenancyWhereInput[]
    OR?: TenancyWhereInput[]
    NOT?: TenancyWhereInput | TenancyWhereInput[]
    id?: StringFilter<"Tenancy"> | string
    propertyId?: StringFilter<"Tenancy"> | string
    landlordId?: StringFilter<"Tenancy"> | string
    tenantId?: StringFilter<"Tenancy"> | string
    agentId?: StringNullableFilter<"Tenancy"> | string | null
    startDate?: DateTimeFilter<"Tenancy"> | Date | string
    endDate?: DateTimeFilter<"Tenancy"> | Date | string
    monthlyRent?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFilter<"Tenancy"> | Date | string
    updatedAt?: DateTimeFilter<"Tenancy"> | Date | string
    property?: XOR<PropertyScalarRelationFilter, PropertyWhereInput>
    landlord?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
    tenant?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
    agent?: XOR<StakeholderNullableScalarRelationFilter, StakeholderWhereInput> | null
    inspections?: InspectionListRelationFilter
  }

  export type TenancyOrderByWithRelationInput = {
    id?: SortOrder
    propertyId?: SortOrder
    landlordId?: SortOrder
    tenantId?: SortOrder
    agentId?: SortOrderInput | SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    monthlyRent?: SortOrder
    deposit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    property?: PropertyOrderByWithRelationInput
    landlord?: StakeholderOrderByWithRelationInput
    tenant?: StakeholderOrderByWithRelationInput
    agent?: StakeholderOrderByWithRelationInput
    inspections?: InspectionOrderByRelationAggregateInput
  }

  export type TenancyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TenancyWhereInput | TenancyWhereInput[]
    OR?: TenancyWhereInput[]
    NOT?: TenancyWhereInput | TenancyWhereInput[]
    propertyId?: StringFilter<"Tenancy"> | string
    landlordId?: StringFilter<"Tenancy"> | string
    tenantId?: StringFilter<"Tenancy"> | string
    agentId?: StringNullableFilter<"Tenancy"> | string | null
    startDate?: DateTimeFilter<"Tenancy"> | Date | string
    endDate?: DateTimeFilter<"Tenancy"> | Date | string
    monthlyRent?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFilter<"Tenancy"> | Date | string
    updatedAt?: DateTimeFilter<"Tenancy"> | Date | string
    property?: XOR<PropertyScalarRelationFilter, PropertyWhereInput>
    landlord?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
    tenant?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
    agent?: XOR<StakeholderNullableScalarRelationFilter, StakeholderWhereInput> | null
    inspections?: InspectionListRelationFilter
  }, "id">

  export type TenancyOrderByWithAggregationInput = {
    id?: SortOrder
    propertyId?: SortOrder
    landlordId?: SortOrder
    tenantId?: SortOrder
    agentId?: SortOrderInput | SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    monthlyRent?: SortOrder
    deposit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TenancyCountOrderByAggregateInput
    _avg?: TenancyAvgOrderByAggregateInput
    _max?: TenancyMaxOrderByAggregateInput
    _min?: TenancyMinOrderByAggregateInput
    _sum?: TenancySumOrderByAggregateInput
  }

  export type TenancyScalarWhereWithAggregatesInput = {
    AND?: TenancyScalarWhereWithAggregatesInput | TenancyScalarWhereWithAggregatesInput[]
    OR?: TenancyScalarWhereWithAggregatesInput[]
    NOT?: TenancyScalarWhereWithAggregatesInput | TenancyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Tenancy"> | string
    propertyId?: StringWithAggregatesFilter<"Tenancy"> | string
    landlordId?: StringWithAggregatesFilter<"Tenancy"> | string
    tenantId?: StringWithAggregatesFilter<"Tenancy"> | string
    agentId?: StringNullableWithAggregatesFilter<"Tenancy"> | string | null
    startDate?: DateTimeWithAggregatesFilter<"Tenancy"> | Date | string
    endDate?: DateTimeWithAggregatesFilter<"Tenancy"> | Date | string
    monthlyRent?: DecimalWithAggregatesFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    deposit?: DecimalWithAggregatesFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeWithAggregatesFilter<"Tenancy"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Tenancy"> | Date | string
  }

  export type InspectionWhereInput = {
    AND?: InspectionWhereInput | InspectionWhereInput[]
    OR?: InspectionWhereInput[]
    NOT?: InspectionWhereInput | InspectionWhereInput[]
    id?: StringFilter<"Inspection"> | string
    tenancyId?: StringFilter<"Inspection"> | string
    kind?: EnumInspectionKindFilter<"Inspection"> | $Enums.InspectionKind
    status?: EnumInspectionStatusFilter<"Inspection"> | $Enums.InspectionStatus
    conductedById?: StringNullableFilter<"Inspection"> | string | null
    conductedAt?: DateTimeNullableFilter<"Inspection"> | Date | string | null
    baselineId?: StringNullableFilter<"Inspection"> | string | null
    summary?: StringNullableFilter<"Inspection"> | string | null
    processingError?: StringNullableFilter<"Inspection"> | string | null
    createdAt?: DateTimeFilter<"Inspection"> | Date | string
    updatedAt?: DateTimeFilter<"Inspection"> | Date | string
    tenancy?: XOR<TenancyScalarRelationFilter, TenancyWhereInput>
    conductedBy?: XOR<StakeholderNullableScalarRelationFilter, StakeholderWhereInput> | null
    baseline?: XOR<InspectionNullableScalarRelationFilter, InspectionWhereInput> | null
    checkOut?: XOR<InspectionNullableScalarRelationFilter, InspectionWhereInput> | null
    rooms?: RoomListRelationFilter
    findings?: FindingListRelationFilter
    signatures?: SignatureListRelationFilter
  }

  export type InspectionOrderByWithRelationInput = {
    id?: SortOrder
    tenancyId?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    conductedById?: SortOrderInput | SortOrder
    conductedAt?: SortOrderInput | SortOrder
    baselineId?: SortOrderInput | SortOrder
    summary?: SortOrderInput | SortOrder
    processingError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenancy?: TenancyOrderByWithRelationInput
    conductedBy?: StakeholderOrderByWithRelationInput
    baseline?: InspectionOrderByWithRelationInput
    checkOut?: InspectionOrderByWithRelationInput
    rooms?: RoomOrderByRelationAggregateInput
    findings?: FindingOrderByRelationAggregateInput
    signatures?: SignatureOrderByRelationAggregateInput
  }

  export type InspectionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    baselineId?: string
    AND?: InspectionWhereInput | InspectionWhereInput[]
    OR?: InspectionWhereInput[]
    NOT?: InspectionWhereInput | InspectionWhereInput[]
    tenancyId?: StringFilter<"Inspection"> | string
    kind?: EnumInspectionKindFilter<"Inspection"> | $Enums.InspectionKind
    status?: EnumInspectionStatusFilter<"Inspection"> | $Enums.InspectionStatus
    conductedById?: StringNullableFilter<"Inspection"> | string | null
    conductedAt?: DateTimeNullableFilter<"Inspection"> | Date | string | null
    summary?: StringNullableFilter<"Inspection"> | string | null
    processingError?: StringNullableFilter<"Inspection"> | string | null
    createdAt?: DateTimeFilter<"Inspection"> | Date | string
    updatedAt?: DateTimeFilter<"Inspection"> | Date | string
    tenancy?: XOR<TenancyScalarRelationFilter, TenancyWhereInput>
    conductedBy?: XOR<StakeholderNullableScalarRelationFilter, StakeholderWhereInput> | null
    baseline?: XOR<InspectionNullableScalarRelationFilter, InspectionWhereInput> | null
    checkOut?: XOR<InspectionNullableScalarRelationFilter, InspectionWhereInput> | null
    rooms?: RoomListRelationFilter
    findings?: FindingListRelationFilter
    signatures?: SignatureListRelationFilter
  }, "id" | "baselineId">

  export type InspectionOrderByWithAggregationInput = {
    id?: SortOrder
    tenancyId?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    conductedById?: SortOrderInput | SortOrder
    conductedAt?: SortOrderInput | SortOrder
    baselineId?: SortOrderInput | SortOrder
    summary?: SortOrderInput | SortOrder
    processingError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InspectionCountOrderByAggregateInput
    _max?: InspectionMaxOrderByAggregateInput
    _min?: InspectionMinOrderByAggregateInput
  }

  export type InspectionScalarWhereWithAggregatesInput = {
    AND?: InspectionScalarWhereWithAggregatesInput | InspectionScalarWhereWithAggregatesInput[]
    OR?: InspectionScalarWhereWithAggregatesInput[]
    NOT?: InspectionScalarWhereWithAggregatesInput | InspectionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Inspection"> | string
    tenancyId?: StringWithAggregatesFilter<"Inspection"> | string
    kind?: EnumInspectionKindWithAggregatesFilter<"Inspection"> | $Enums.InspectionKind
    status?: EnumInspectionStatusWithAggregatesFilter<"Inspection"> | $Enums.InspectionStatus
    conductedById?: StringNullableWithAggregatesFilter<"Inspection"> | string | null
    conductedAt?: DateTimeNullableWithAggregatesFilter<"Inspection"> | Date | string | null
    baselineId?: StringNullableWithAggregatesFilter<"Inspection"> | string | null
    summary?: StringNullableWithAggregatesFilter<"Inspection"> | string | null
    processingError?: StringNullableWithAggregatesFilter<"Inspection"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Inspection"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Inspection"> | Date | string
  }

  export type CaptureWhereInput = {
    AND?: CaptureWhereInput | CaptureWhereInput[]
    OR?: CaptureWhereInput[]
    NOT?: CaptureWhereInput | CaptureWhereInput[]
    id?: StringFilter<"Capture"> | string
    roomId?: StringFilter<"Capture"> | string
    kind?: EnumCaptureKindFilter<"Capture"> | $Enums.CaptureKind
    storagePath?: StringFilter<"Capture"> | string
    mimeType?: StringFilter<"Capture"> | string
    sizeBytes?: IntFilter<"Capture"> | number
    durationSec?: IntNullableFilter<"Capture"> | number | null
    transcript?: StringNullableFilter<"Capture"> | string | null
    note?: StringNullableFilter<"Capture"> | string | null
    processedAt?: DateTimeNullableFilter<"Capture"> | Date | string | null
    createdAt?: DateTimeFilter<"Capture"> | Date | string
    room?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    items?: InspectionItemListRelationFilter
  }

  export type CaptureOrderByWithRelationInput = {
    id?: SortOrder
    roomId?: SortOrder
    kind?: SortOrder
    storagePath?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    durationSec?: SortOrderInput | SortOrder
    transcript?: SortOrderInput | SortOrder
    note?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    room?: RoomOrderByWithRelationInput
    items?: InspectionItemOrderByRelationAggregateInput
  }

  export type CaptureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CaptureWhereInput | CaptureWhereInput[]
    OR?: CaptureWhereInput[]
    NOT?: CaptureWhereInput | CaptureWhereInput[]
    roomId?: StringFilter<"Capture"> | string
    kind?: EnumCaptureKindFilter<"Capture"> | $Enums.CaptureKind
    storagePath?: StringFilter<"Capture"> | string
    mimeType?: StringFilter<"Capture"> | string
    sizeBytes?: IntFilter<"Capture"> | number
    durationSec?: IntNullableFilter<"Capture"> | number | null
    transcript?: StringNullableFilter<"Capture"> | string | null
    note?: StringNullableFilter<"Capture"> | string | null
    processedAt?: DateTimeNullableFilter<"Capture"> | Date | string | null
    createdAt?: DateTimeFilter<"Capture"> | Date | string
    room?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    items?: InspectionItemListRelationFilter
  }, "id">

  export type CaptureOrderByWithAggregationInput = {
    id?: SortOrder
    roomId?: SortOrder
    kind?: SortOrder
    storagePath?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    durationSec?: SortOrderInput | SortOrder
    transcript?: SortOrderInput | SortOrder
    note?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: CaptureCountOrderByAggregateInput
    _avg?: CaptureAvgOrderByAggregateInput
    _max?: CaptureMaxOrderByAggregateInput
    _min?: CaptureMinOrderByAggregateInput
    _sum?: CaptureSumOrderByAggregateInput
  }

  export type CaptureScalarWhereWithAggregatesInput = {
    AND?: CaptureScalarWhereWithAggregatesInput | CaptureScalarWhereWithAggregatesInput[]
    OR?: CaptureScalarWhereWithAggregatesInput[]
    NOT?: CaptureScalarWhereWithAggregatesInput | CaptureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Capture"> | string
    roomId?: StringWithAggregatesFilter<"Capture"> | string
    kind?: EnumCaptureKindWithAggregatesFilter<"Capture"> | $Enums.CaptureKind
    storagePath?: StringWithAggregatesFilter<"Capture"> | string
    mimeType?: StringWithAggregatesFilter<"Capture"> | string
    sizeBytes?: IntWithAggregatesFilter<"Capture"> | number
    durationSec?: IntNullableWithAggregatesFilter<"Capture"> | number | null
    transcript?: StringNullableWithAggregatesFilter<"Capture"> | string | null
    note?: StringNullableWithAggregatesFilter<"Capture"> | string | null
    processedAt?: DateTimeNullableWithAggregatesFilter<"Capture"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Capture"> | Date | string
  }

  export type RoomWhereInput = {
    AND?: RoomWhereInput | RoomWhereInput[]
    OR?: RoomWhereInput[]
    NOT?: RoomWhereInput | RoomWhereInput[]
    id?: StringFilter<"Room"> | string
    inspectionId?: StringFilter<"Room"> | string
    name?: StringFilter<"Room"> | string
    order?: IntFilter<"Room"> | number
    status?: EnumRoomStatusFilter<"Room"> | $Enums.RoomStatus
    processingError?: StringNullableFilter<"Room"> | string | null
    createdAt?: DateTimeFilter<"Room"> | Date | string
    updatedAt?: DateTimeFilter<"Room"> | Date | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    captures?: CaptureListRelationFilter
    items?: InspectionItemListRelationFilter
  }

  export type RoomOrderByWithRelationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    name?: SortOrder
    order?: SortOrder
    status?: SortOrder
    processingError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    inspection?: InspectionOrderByWithRelationInput
    captures?: CaptureOrderByRelationAggregateInput
    items?: InspectionItemOrderByRelationAggregateInput
  }

  export type RoomWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RoomWhereInput | RoomWhereInput[]
    OR?: RoomWhereInput[]
    NOT?: RoomWhereInput | RoomWhereInput[]
    inspectionId?: StringFilter<"Room"> | string
    name?: StringFilter<"Room"> | string
    order?: IntFilter<"Room"> | number
    status?: EnumRoomStatusFilter<"Room"> | $Enums.RoomStatus
    processingError?: StringNullableFilter<"Room"> | string | null
    createdAt?: DateTimeFilter<"Room"> | Date | string
    updatedAt?: DateTimeFilter<"Room"> | Date | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    captures?: CaptureListRelationFilter
    items?: InspectionItemListRelationFilter
  }, "id">

  export type RoomOrderByWithAggregationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    name?: SortOrder
    order?: SortOrder
    status?: SortOrder
    processingError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RoomCountOrderByAggregateInput
    _avg?: RoomAvgOrderByAggregateInput
    _max?: RoomMaxOrderByAggregateInput
    _min?: RoomMinOrderByAggregateInput
    _sum?: RoomSumOrderByAggregateInput
  }

  export type RoomScalarWhereWithAggregatesInput = {
    AND?: RoomScalarWhereWithAggregatesInput | RoomScalarWhereWithAggregatesInput[]
    OR?: RoomScalarWhereWithAggregatesInput[]
    NOT?: RoomScalarWhereWithAggregatesInput | RoomScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Room"> | string
    inspectionId?: StringWithAggregatesFilter<"Room"> | string
    name?: StringWithAggregatesFilter<"Room"> | string
    order?: IntWithAggregatesFilter<"Room"> | number
    status?: EnumRoomStatusWithAggregatesFilter<"Room"> | $Enums.RoomStatus
    processingError?: StringNullableWithAggregatesFilter<"Room"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Room"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Room"> | Date | string
  }

  export type InspectionItemWhereInput = {
    AND?: InspectionItemWhereInput | InspectionItemWhereInput[]
    OR?: InspectionItemWhereInput[]
    NOT?: InspectionItemWhereInput | InspectionItemWhereInput[]
    id?: StringFilter<"InspectionItem"> | string
    roomId?: StringFilter<"InspectionItem"> | string
    name?: StringFilter<"InspectionItem"> | string
    category?: EnumItemCategoryFilter<"InspectionItem"> | $Enums.ItemCategory
    condition?: EnumItemConditionFilter<"InspectionItem"> | $Enums.ItemCondition
    quantity?: IntFilter<"InspectionItem"> | number
    notes?: StringNullableFilter<"InspectionItem"> | string | null
    identifier?: StringNullableFilter<"InspectionItem"> | string | null
    meterReading?: StringNullableFilter<"InspectionItem"> | string | null
    sourceCaptureId?: StringNullableFilter<"InspectionItem"> | string | null
    sourceTimestampSec?: IntNullableFilter<"InspectionItem"> | number | null
    confidence?: FloatNullableFilter<"InspectionItem"> | number | null
    editedByHuman?: BoolFilter<"InspectionItem"> | boolean
    createdAt?: DateTimeFilter<"InspectionItem"> | Date | string
    updatedAt?: DateTimeFilter<"InspectionItem"> | Date | string
    room?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    sourceCapture?: XOR<CaptureNullableScalarRelationFilter, CaptureWhereInput> | null
    findingsAsSubject?: FindingListRelationFilter
    findingsAsBaseline?: FindingListRelationFilter
  }

  export type InspectionItemOrderByWithRelationInput = {
    id?: SortOrder
    roomId?: SortOrder
    name?: SortOrder
    category?: SortOrder
    condition?: SortOrder
    quantity?: SortOrder
    notes?: SortOrderInput | SortOrder
    identifier?: SortOrderInput | SortOrder
    meterReading?: SortOrderInput | SortOrder
    sourceCaptureId?: SortOrderInput | SortOrder
    sourceTimestampSec?: SortOrderInput | SortOrder
    confidence?: SortOrderInput | SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    room?: RoomOrderByWithRelationInput
    sourceCapture?: CaptureOrderByWithRelationInput
    findingsAsSubject?: FindingOrderByRelationAggregateInput
    findingsAsBaseline?: FindingOrderByRelationAggregateInput
  }

  export type InspectionItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InspectionItemWhereInput | InspectionItemWhereInput[]
    OR?: InspectionItemWhereInput[]
    NOT?: InspectionItemWhereInput | InspectionItemWhereInput[]
    roomId?: StringFilter<"InspectionItem"> | string
    name?: StringFilter<"InspectionItem"> | string
    category?: EnumItemCategoryFilter<"InspectionItem"> | $Enums.ItemCategory
    condition?: EnumItemConditionFilter<"InspectionItem"> | $Enums.ItemCondition
    quantity?: IntFilter<"InspectionItem"> | number
    notes?: StringNullableFilter<"InspectionItem"> | string | null
    identifier?: StringNullableFilter<"InspectionItem"> | string | null
    meterReading?: StringNullableFilter<"InspectionItem"> | string | null
    sourceCaptureId?: StringNullableFilter<"InspectionItem"> | string | null
    sourceTimestampSec?: IntNullableFilter<"InspectionItem"> | number | null
    confidence?: FloatNullableFilter<"InspectionItem"> | number | null
    editedByHuman?: BoolFilter<"InspectionItem"> | boolean
    createdAt?: DateTimeFilter<"InspectionItem"> | Date | string
    updatedAt?: DateTimeFilter<"InspectionItem"> | Date | string
    room?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    sourceCapture?: XOR<CaptureNullableScalarRelationFilter, CaptureWhereInput> | null
    findingsAsSubject?: FindingListRelationFilter
    findingsAsBaseline?: FindingListRelationFilter
  }, "id">

  export type InspectionItemOrderByWithAggregationInput = {
    id?: SortOrder
    roomId?: SortOrder
    name?: SortOrder
    category?: SortOrder
    condition?: SortOrder
    quantity?: SortOrder
    notes?: SortOrderInput | SortOrder
    identifier?: SortOrderInput | SortOrder
    meterReading?: SortOrderInput | SortOrder
    sourceCaptureId?: SortOrderInput | SortOrder
    sourceTimestampSec?: SortOrderInput | SortOrder
    confidence?: SortOrderInput | SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InspectionItemCountOrderByAggregateInput
    _avg?: InspectionItemAvgOrderByAggregateInput
    _max?: InspectionItemMaxOrderByAggregateInput
    _min?: InspectionItemMinOrderByAggregateInput
    _sum?: InspectionItemSumOrderByAggregateInput
  }

  export type InspectionItemScalarWhereWithAggregatesInput = {
    AND?: InspectionItemScalarWhereWithAggregatesInput | InspectionItemScalarWhereWithAggregatesInput[]
    OR?: InspectionItemScalarWhereWithAggregatesInput[]
    NOT?: InspectionItemScalarWhereWithAggregatesInput | InspectionItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InspectionItem"> | string
    roomId?: StringWithAggregatesFilter<"InspectionItem"> | string
    name?: StringWithAggregatesFilter<"InspectionItem"> | string
    category?: EnumItemCategoryWithAggregatesFilter<"InspectionItem"> | $Enums.ItemCategory
    condition?: EnumItemConditionWithAggregatesFilter<"InspectionItem"> | $Enums.ItemCondition
    quantity?: IntWithAggregatesFilter<"InspectionItem"> | number
    notes?: StringNullableWithAggregatesFilter<"InspectionItem"> | string | null
    identifier?: StringNullableWithAggregatesFilter<"InspectionItem"> | string | null
    meterReading?: StringNullableWithAggregatesFilter<"InspectionItem"> | string | null
    sourceCaptureId?: StringNullableWithAggregatesFilter<"InspectionItem"> | string | null
    sourceTimestampSec?: IntNullableWithAggregatesFilter<"InspectionItem"> | number | null
    confidence?: FloatNullableWithAggregatesFilter<"InspectionItem"> | number | null
    editedByHuman?: BoolWithAggregatesFilter<"InspectionItem"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"InspectionItem"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"InspectionItem"> | Date | string
  }

  export type FindingWhereInput = {
    AND?: FindingWhereInput | FindingWhereInput[]
    OR?: FindingWhereInput[]
    NOT?: FindingWhereInput | FindingWhereInput[]
    id?: StringFilter<"Finding"> | string
    inspectionId?: StringFilter<"Finding"> | string
    itemId?: StringNullableFilter<"Finding"> | string | null
    baselineItemId?: StringNullableFilter<"Finding"> | string | null
    changeType?: EnumChangeTypeFilter<"Finding"> | $Enums.ChangeType
    verdict?: EnumVerdictFilter<"Finding"> | $Enums.Verdict
    rationale?: StringFilter<"Finding"> | string
    estimatedCost?: DecimalNullableFilter<"Finding"> | Decimal | DecimalJsLike | number | string | null
    confidence?: FloatNullableFilter<"Finding"> | number | null
    editedByHuman?: BoolFilter<"Finding"> | boolean
    createdAt?: DateTimeFilter<"Finding"> | Date | string
    updatedAt?: DateTimeFilter<"Finding"> | Date | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    item?: XOR<InspectionItemNullableScalarRelationFilter, InspectionItemWhereInput> | null
    baselineItem?: XOR<InspectionItemNullableScalarRelationFilter, InspectionItemWhereInput> | null
  }

  export type FindingOrderByWithRelationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    itemId?: SortOrderInput | SortOrder
    baselineItemId?: SortOrderInput | SortOrder
    changeType?: SortOrder
    verdict?: SortOrder
    rationale?: SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    confidence?: SortOrderInput | SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    inspection?: InspectionOrderByWithRelationInput
    item?: InspectionItemOrderByWithRelationInput
    baselineItem?: InspectionItemOrderByWithRelationInput
  }

  export type FindingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FindingWhereInput | FindingWhereInput[]
    OR?: FindingWhereInput[]
    NOT?: FindingWhereInput | FindingWhereInput[]
    inspectionId?: StringFilter<"Finding"> | string
    itemId?: StringNullableFilter<"Finding"> | string | null
    baselineItemId?: StringNullableFilter<"Finding"> | string | null
    changeType?: EnumChangeTypeFilter<"Finding"> | $Enums.ChangeType
    verdict?: EnumVerdictFilter<"Finding"> | $Enums.Verdict
    rationale?: StringFilter<"Finding"> | string
    estimatedCost?: DecimalNullableFilter<"Finding"> | Decimal | DecimalJsLike | number | string | null
    confidence?: FloatNullableFilter<"Finding"> | number | null
    editedByHuman?: BoolFilter<"Finding"> | boolean
    createdAt?: DateTimeFilter<"Finding"> | Date | string
    updatedAt?: DateTimeFilter<"Finding"> | Date | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    item?: XOR<InspectionItemNullableScalarRelationFilter, InspectionItemWhereInput> | null
    baselineItem?: XOR<InspectionItemNullableScalarRelationFilter, InspectionItemWhereInput> | null
  }, "id">

  export type FindingOrderByWithAggregationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    itemId?: SortOrderInput | SortOrder
    baselineItemId?: SortOrderInput | SortOrder
    changeType?: SortOrder
    verdict?: SortOrder
    rationale?: SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    confidence?: SortOrderInput | SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FindingCountOrderByAggregateInput
    _avg?: FindingAvgOrderByAggregateInput
    _max?: FindingMaxOrderByAggregateInput
    _min?: FindingMinOrderByAggregateInput
    _sum?: FindingSumOrderByAggregateInput
  }

  export type FindingScalarWhereWithAggregatesInput = {
    AND?: FindingScalarWhereWithAggregatesInput | FindingScalarWhereWithAggregatesInput[]
    OR?: FindingScalarWhereWithAggregatesInput[]
    NOT?: FindingScalarWhereWithAggregatesInput | FindingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Finding"> | string
    inspectionId?: StringWithAggregatesFilter<"Finding"> | string
    itemId?: StringNullableWithAggregatesFilter<"Finding"> | string | null
    baselineItemId?: StringNullableWithAggregatesFilter<"Finding"> | string | null
    changeType?: EnumChangeTypeWithAggregatesFilter<"Finding"> | $Enums.ChangeType
    verdict?: EnumVerdictWithAggregatesFilter<"Finding"> | $Enums.Verdict
    rationale?: StringWithAggregatesFilter<"Finding"> | string
    estimatedCost?: DecimalNullableWithAggregatesFilter<"Finding"> | Decimal | DecimalJsLike | number | string | null
    confidence?: FloatNullableWithAggregatesFilter<"Finding"> | number | null
    editedByHuman?: BoolWithAggregatesFilter<"Finding"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Finding"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Finding"> | Date | string
  }

  export type SignatureWhereInput = {
    AND?: SignatureWhereInput | SignatureWhereInput[]
    OR?: SignatureWhereInput[]
    NOT?: SignatureWhereInput | SignatureWhereInput[]
    id?: StringFilter<"Signature"> | string
    inspectionId?: StringFilter<"Signature"> | string
    stakeholderId?: StringFilter<"Signature"> | string
    signedAt?: DateTimeFilter<"Signature"> | Date | string
    ipAddress?: StringNullableFilter<"Signature"> | string | null
    imageData?: StringFilter<"Signature"> | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    stakeholder?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
  }

  export type SignatureOrderByWithRelationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    stakeholderId?: SortOrder
    signedAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    imageData?: SortOrder
    inspection?: InspectionOrderByWithRelationInput
    stakeholder?: StakeholderOrderByWithRelationInput
  }

  export type SignatureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    inspectionId_stakeholderId?: SignatureInspectionIdStakeholderIdCompoundUniqueInput
    AND?: SignatureWhereInput | SignatureWhereInput[]
    OR?: SignatureWhereInput[]
    NOT?: SignatureWhereInput | SignatureWhereInput[]
    inspectionId?: StringFilter<"Signature"> | string
    stakeholderId?: StringFilter<"Signature"> | string
    signedAt?: DateTimeFilter<"Signature"> | Date | string
    ipAddress?: StringNullableFilter<"Signature"> | string | null
    imageData?: StringFilter<"Signature"> | string
    inspection?: XOR<InspectionScalarRelationFilter, InspectionWhereInput>
    stakeholder?: XOR<StakeholderScalarRelationFilter, StakeholderWhereInput>
  }, "id" | "inspectionId_stakeholderId">

  export type SignatureOrderByWithAggregationInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    stakeholderId?: SortOrder
    signedAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    imageData?: SortOrder
    _count?: SignatureCountOrderByAggregateInput
    _max?: SignatureMaxOrderByAggregateInput
    _min?: SignatureMinOrderByAggregateInput
  }

  export type SignatureScalarWhereWithAggregatesInput = {
    AND?: SignatureScalarWhereWithAggregatesInput | SignatureScalarWhereWithAggregatesInput[]
    OR?: SignatureScalarWhereWithAggregatesInput[]
    NOT?: SignatureScalarWhereWithAggregatesInput | SignatureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Signature"> | string
    inspectionId?: StringWithAggregatesFilter<"Signature"> | string
    stakeholderId?: StringWithAggregatesFilter<"Signature"> | string
    signedAt?: DateTimeWithAggregatesFilter<"Signature"> | Date | string
    ipAddress?: StringNullableWithAggregatesFilter<"Signature"> | string | null
    imageData?: StringWithAggregatesFilter<"Signature"> | string
  }

  export type StakeholderCreateInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionCreateNestedManyWithoutConductedByInput
    signatures?: SignatureCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUncheckedCreateInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyUncheckedCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyUncheckedCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyUncheckedCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionUncheckedCreateNestedManyWithoutConductedByInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUncheckedUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUncheckedUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUncheckedUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUncheckedUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderCreateManyInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StakeholderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StakeholderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PropertyCreateInput = {
    id?: string
    line1: string
    unit?: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancies?: TenancyCreateNestedManyWithoutPropertyInput
  }

  export type PropertyUncheckedCreateInput = {
    id?: string
    line1: string
    unit?: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancies?: TenancyUncheckedCreateNestedManyWithoutPropertyInput
  }

  export type PropertyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancies?: TenancyUpdateManyWithoutPropertyNestedInput
  }

  export type PropertyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancies?: TenancyUncheckedUpdateManyWithoutPropertyNestedInput
  }

  export type PropertyCreateManyInput = {
    id?: string
    line1: string
    unit?: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PropertyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PropertyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenancyCreateInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    property: PropertyCreateNestedOneWithoutTenanciesInput
    landlord: StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput
    tenant: StakeholderCreateNestedOneWithoutTenanciesAsTenantInput
    agent?: StakeholderCreateNestedOneWithoutTenanciesAsAgentInput
    inspections?: InspectionCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUncheckedCreateInput = {
    id?: string
    propertyId: string
    landlordId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    inspections?: InspectionUncheckedCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    property?: PropertyUpdateOneRequiredWithoutTenanciesNestedInput
    landlord?: StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput
    tenant?: StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput
    agent?: StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput
    inspections?: InspectionUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspections?: InspectionUncheckedUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyCreateManyInput = {
    id?: string
    propertyId: string
    landlordId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenancyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenancyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionCreateInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionCreateManyInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InspectionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CaptureCreateInput = {
    id?: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    room: RoomCreateNestedOneWithoutCapturesInput
    items?: InspectionItemCreateNestedManyWithoutSourceCaptureInput
  }

  export type CaptureUncheckedCreateInput = {
    id?: string
    roomId: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    items?: InspectionItemUncheckedCreateNestedManyWithoutSourceCaptureInput
  }

  export type CaptureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutCapturesNestedInput
    items?: InspectionItemUpdateManyWithoutSourceCaptureNestedInput
  }

  export type CaptureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: InspectionItemUncheckedUpdateManyWithoutSourceCaptureNestedInput
  }

  export type CaptureCreateManyInput = {
    id?: string
    roomId: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type CaptureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CaptureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomCreateInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutRoomsInput
    captures?: CaptureCreateNestedManyWithoutRoomInput
    items?: InspectionItemCreateNestedManyWithoutRoomInput
  }

  export type RoomUncheckedCreateInput = {
    id?: string
    inspectionId: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    captures?: CaptureUncheckedCreateNestedManyWithoutRoomInput
    items?: InspectionItemUncheckedCreateNestedManyWithoutRoomInput
  }

  export type RoomUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutRoomsNestedInput
    captures?: CaptureUpdateManyWithoutRoomNestedInput
    items?: InspectionItemUpdateManyWithoutRoomNestedInput
  }

  export type RoomUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    captures?: CaptureUncheckedUpdateManyWithoutRoomNestedInput
    items?: InspectionItemUncheckedUpdateManyWithoutRoomNestedInput
  }

  export type RoomCreateManyInput = {
    id?: string
    inspectionId: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RoomUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionItemCreateInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    room: RoomCreateNestedOneWithoutItemsInput
    sourceCapture?: CaptureCreateNestedOneWithoutItemsInput
    findingsAsSubject?: FindingCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemUncheckedCreateInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    findingsAsSubject?: FindingUncheckedCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingUncheckedCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutItemsNestedInput
    sourceCapture?: CaptureUpdateOneWithoutItemsNestedInput
    findingsAsSubject?: FindingUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    findingsAsSubject?: FindingUncheckedUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUncheckedUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemCreateManyInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InspectionItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingCreateInput = {
    id?: string
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutFindingsInput
    item?: InspectionItemCreateNestedOneWithoutFindingsAsSubjectInput
    baselineItem?: InspectionItemCreateNestedOneWithoutFindingsAsBaselineInput
  }

  export type FindingUncheckedCreateInput = {
    id?: string
    inspectionId: string
    itemId?: string | null
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutFindingsNestedInput
    item?: InspectionItemUpdateOneWithoutFindingsAsSubjectNestedInput
    baselineItem?: InspectionItemUpdateOneWithoutFindingsAsBaselineNestedInput
  }

  export type FindingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingCreateManyInput = {
    id?: string
    inspectionId: string
    itemId?: string | null
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SignatureCreateInput = {
    id?: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
    inspection: InspectionCreateNestedOneWithoutSignaturesInput
    stakeholder: StakeholderCreateNestedOneWithoutSignaturesInput
  }

  export type SignatureUncheckedCreateInput = {
    id?: string
    inspectionId: string
    stakeholderId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type SignatureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
    inspection?: InspectionUpdateOneRequiredWithoutSignaturesNestedInput
    stakeholder?: StakeholderUpdateOneRequiredWithoutSignaturesNestedInput
  }

  export type SignatureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    stakeholderId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type SignatureCreateManyInput = {
    id?: string
    inspectionId: string
    stakeholderId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type SignatureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type SignatureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    stakeholderId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumStakeholderKindFilter<$PrismaModel = never> = {
    equals?: $Enums.StakeholderKind | EnumStakeholderKindFieldRefInput<$PrismaModel>
    in?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumStakeholderKindFilter<$PrismaModel> | $Enums.StakeholderKind
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type TenancyListRelationFilter = {
    every?: TenancyWhereInput
    some?: TenancyWhereInput
    none?: TenancyWhereInput
  }

  export type InspectionListRelationFilter = {
    every?: InspectionWhereInput
    some?: InspectionWhereInput
    none?: InspectionWhereInput
  }

  export type SignatureListRelationFilter = {
    every?: SignatureWhereInput
    some?: SignatureWhereInput
    none?: SignatureWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type TenancyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InspectionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SignatureOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type StakeholderCountOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    name?: SortOrder
    idNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StakeholderMaxOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    name?: SortOrder
    idNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StakeholderMinOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    name?: SortOrder
    idNumber?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumStakeholderKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StakeholderKind | EnumStakeholderKindFieldRefInput<$PrismaModel>
    in?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumStakeholderKindWithAggregatesFilter<$PrismaModel> | $Enums.StakeholderKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStakeholderKindFilter<$PrismaModel>
    _max?: NestedEnumStakeholderKindFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumPropertyTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.PropertyType | EnumPropertyTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumPropertyTypeFilter<$PrismaModel> | $Enums.PropertyType
  }

  export type PropertyCountOrderByAggregateInput = {
    id?: SortOrder
    line1?: SortOrder
    unit?: SortOrder
    postalCode?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PropertyMaxOrderByAggregateInput = {
    id?: SortOrder
    line1?: SortOrder
    unit?: SortOrder
    postalCode?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PropertyMinOrderByAggregateInput = {
    id?: SortOrder
    line1?: SortOrder
    unit?: SortOrder
    postalCode?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumPropertyTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PropertyType | EnumPropertyTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumPropertyTypeWithAggregatesFilter<$PrismaModel> | $Enums.PropertyType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPropertyTypeFilter<$PrismaModel>
    _max?: NestedEnumPropertyTypeFilter<$PrismaModel>
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type PropertyScalarRelationFilter = {
    is?: PropertyWhereInput
    isNot?: PropertyWhereInput
  }

  export type StakeholderScalarRelationFilter = {
    is?: StakeholderWhereInput
    isNot?: StakeholderWhereInput
  }

  export type StakeholderNullableScalarRelationFilter = {
    is?: StakeholderWhereInput | null
    isNot?: StakeholderWhereInput | null
  }

  export type TenancyCountOrderByAggregateInput = {
    id?: SortOrder
    propertyId?: SortOrder
    landlordId?: SortOrder
    tenantId?: SortOrder
    agentId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    monthlyRent?: SortOrder
    deposit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenancyAvgOrderByAggregateInput = {
    monthlyRent?: SortOrder
    deposit?: SortOrder
  }

  export type TenancyMaxOrderByAggregateInput = {
    id?: SortOrder
    propertyId?: SortOrder
    landlordId?: SortOrder
    tenantId?: SortOrder
    agentId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    monthlyRent?: SortOrder
    deposit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenancyMinOrderByAggregateInput = {
    id?: SortOrder
    propertyId?: SortOrder
    landlordId?: SortOrder
    tenantId?: SortOrder
    agentId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    monthlyRent?: SortOrder
    deposit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenancySumOrderByAggregateInput = {
    monthlyRent?: SortOrder
    deposit?: SortOrder
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type EnumInspectionKindFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionKind | EnumInspectionKindFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionKindFilter<$PrismaModel> | $Enums.InspectionKind
  }

  export type EnumInspectionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionStatus | EnumInspectionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionStatusFilter<$PrismaModel> | $Enums.InspectionStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type TenancyScalarRelationFilter = {
    is?: TenancyWhereInput
    isNot?: TenancyWhereInput
  }

  export type InspectionNullableScalarRelationFilter = {
    is?: InspectionWhereInput | null
    isNot?: InspectionWhereInput | null
  }

  export type RoomListRelationFilter = {
    every?: RoomWhereInput
    some?: RoomWhereInput
    none?: RoomWhereInput
  }

  export type FindingListRelationFilter = {
    every?: FindingWhereInput
    some?: FindingWhereInput
    none?: FindingWhereInput
  }

  export type RoomOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FindingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InspectionCountOrderByAggregateInput = {
    id?: SortOrder
    tenancyId?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    conductedById?: SortOrder
    conductedAt?: SortOrder
    baselineId?: SortOrder
    summary?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InspectionMaxOrderByAggregateInput = {
    id?: SortOrder
    tenancyId?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    conductedById?: SortOrder
    conductedAt?: SortOrder
    baselineId?: SortOrder
    summary?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InspectionMinOrderByAggregateInput = {
    id?: SortOrder
    tenancyId?: SortOrder
    kind?: SortOrder
    status?: SortOrder
    conductedById?: SortOrder
    conductedAt?: SortOrder
    baselineId?: SortOrder
    summary?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumInspectionKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionKind | EnumInspectionKindFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionKindWithAggregatesFilter<$PrismaModel> | $Enums.InspectionKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInspectionKindFilter<$PrismaModel>
    _max?: NestedEnumInspectionKindFilter<$PrismaModel>
  }

  export type EnumInspectionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionStatus | EnumInspectionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionStatusWithAggregatesFilter<$PrismaModel> | $Enums.InspectionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInspectionStatusFilter<$PrismaModel>
    _max?: NestedEnumInspectionStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumCaptureKindFilter<$PrismaModel = never> = {
    equals?: $Enums.CaptureKind | EnumCaptureKindFieldRefInput<$PrismaModel>
    in?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    not?: NestedEnumCaptureKindFilter<$PrismaModel> | $Enums.CaptureKind
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type RoomScalarRelationFilter = {
    is?: RoomWhereInput
    isNot?: RoomWhereInput
  }

  export type InspectionItemListRelationFilter = {
    every?: InspectionItemWhereInput
    some?: InspectionItemWhereInput
    none?: InspectionItemWhereInput
  }

  export type InspectionItemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CaptureCountOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    kind?: SortOrder
    storagePath?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    durationSec?: SortOrder
    transcript?: SortOrder
    note?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type CaptureAvgOrderByAggregateInput = {
    sizeBytes?: SortOrder
    durationSec?: SortOrder
  }

  export type CaptureMaxOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    kind?: SortOrder
    storagePath?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    durationSec?: SortOrder
    transcript?: SortOrder
    note?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type CaptureMinOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    kind?: SortOrder
    storagePath?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    durationSec?: SortOrder
    transcript?: SortOrder
    note?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type CaptureSumOrderByAggregateInput = {
    sizeBytes?: SortOrder
    durationSec?: SortOrder
  }

  export type EnumCaptureKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CaptureKind | EnumCaptureKindFieldRefInput<$PrismaModel>
    in?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    not?: NestedEnumCaptureKindWithAggregatesFilter<$PrismaModel> | $Enums.CaptureKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCaptureKindFilter<$PrismaModel>
    _max?: NestedEnumCaptureKindFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumRoomStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RoomStatus | EnumRoomStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRoomStatusFilter<$PrismaModel> | $Enums.RoomStatus
  }

  export type InspectionScalarRelationFilter = {
    is?: InspectionWhereInput
    isNot?: InspectionWhereInput
  }

  export type CaptureListRelationFilter = {
    every?: CaptureWhereInput
    some?: CaptureWhereInput
    none?: CaptureWhereInput
  }

  export type CaptureOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RoomCountOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    name?: SortOrder
    order?: SortOrder
    status?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomAvgOrderByAggregateInput = {
    order?: SortOrder
  }

  export type RoomMaxOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    name?: SortOrder
    order?: SortOrder
    status?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomMinOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    name?: SortOrder
    order?: SortOrder
    status?: SortOrder
    processingError?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomSumOrderByAggregateInput = {
    order?: SortOrder
  }

  export type EnumRoomStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoomStatus | EnumRoomStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRoomStatusWithAggregatesFilter<$PrismaModel> | $Enums.RoomStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoomStatusFilter<$PrismaModel>
    _max?: NestedEnumRoomStatusFilter<$PrismaModel>
  }

  export type EnumItemCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCategory | EnumItemCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumItemCategoryFilter<$PrismaModel> | $Enums.ItemCategory
  }

  export type EnumItemConditionFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCondition | EnumItemConditionFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    not?: NestedEnumItemConditionFilter<$PrismaModel> | $Enums.ItemCondition
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type CaptureNullableScalarRelationFilter = {
    is?: CaptureWhereInput | null
    isNot?: CaptureWhereInput | null
  }

  export type InspectionItemCountOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    name?: SortOrder
    category?: SortOrder
    condition?: SortOrder
    quantity?: SortOrder
    notes?: SortOrder
    identifier?: SortOrder
    meterReading?: SortOrder
    sourceCaptureId?: SortOrder
    sourceTimestampSec?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InspectionItemAvgOrderByAggregateInput = {
    quantity?: SortOrder
    sourceTimestampSec?: SortOrder
    confidence?: SortOrder
  }

  export type InspectionItemMaxOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    name?: SortOrder
    category?: SortOrder
    condition?: SortOrder
    quantity?: SortOrder
    notes?: SortOrder
    identifier?: SortOrder
    meterReading?: SortOrder
    sourceCaptureId?: SortOrder
    sourceTimestampSec?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InspectionItemMinOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    name?: SortOrder
    category?: SortOrder
    condition?: SortOrder
    quantity?: SortOrder
    notes?: SortOrder
    identifier?: SortOrder
    meterReading?: SortOrder
    sourceCaptureId?: SortOrder
    sourceTimestampSec?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InspectionItemSumOrderByAggregateInput = {
    quantity?: SortOrder
    sourceTimestampSec?: SortOrder
    confidence?: SortOrder
  }

  export type EnumItemCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCategory | EnumItemCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumItemCategoryWithAggregatesFilter<$PrismaModel> | $Enums.ItemCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemCategoryFilter<$PrismaModel>
    _max?: NestedEnumItemCategoryFilter<$PrismaModel>
  }

  export type EnumItemConditionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCondition | EnumItemConditionFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    not?: NestedEnumItemConditionWithAggregatesFilter<$PrismaModel> | $Enums.ItemCondition
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemConditionFilter<$PrismaModel>
    _max?: NestedEnumItemConditionFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumChangeTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ChangeType | EnumChangeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChangeTypeFilter<$PrismaModel> | $Enums.ChangeType
  }

  export type EnumVerdictFilter<$PrismaModel = never> = {
    equals?: $Enums.Verdict | EnumVerdictFieldRefInput<$PrismaModel>
    in?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    notIn?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    not?: NestedEnumVerdictFilter<$PrismaModel> | $Enums.Verdict
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type InspectionItemNullableScalarRelationFilter = {
    is?: InspectionItemWhereInput | null
    isNot?: InspectionItemWhereInput | null
  }

  export type FindingCountOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    itemId?: SortOrder
    baselineItemId?: SortOrder
    changeType?: SortOrder
    verdict?: SortOrder
    rationale?: SortOrder
    estimatedCost?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FindingAvgOrderByAggregateInput = {
    estimatedCost?: SortOrder
    confidence?: SortOrder
  }

  export type FindingMaxOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    itemId?: SortOrder
    baselineItemId?: SortOrder
    changeType?: SortOrder
    verdict?: SortOrder
    rationale?: SortOrder
    estimatedCost?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FindingMinOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    itemId?: SortOrder
    baselineItemId?: SortOrder
    changeType?: SortOrder
    verdict?: SortOrder
    rationale?: SortOrder
    estimatedCost?: SortOrder
    confidence?: SortOrder
    editedByHuman?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FindingSumOrderByAggregateInput = {
    estimatedCost?: SortOrder
    confidence?: SortOrder
  }

  export type EnumChangeTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ChangeType | EnumChangeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChangeTypeWithAggregatesFilter<$PrismaModel> | $Enums.ChangeType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumChangeTypeFilter<$PrismaModel>
    _max?: NestedEnumChangeTypeFilter<$PrismaModel>
  }

  export type EnumVerdictWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Verdict | EnumVerdictFieldRefInput<$PrismaModel>
    in?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    notIn?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    not?: NestedEnumVerdictWithAggregatesFilter<$PrismaModel> | $Enums.Verdict
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVerdictFilter<$PrismaModel>
    _max?: NestedEnumVerdictFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type SignatureInspectionIdStakeholderIdCompoundUniqueInput = {
    inspectionId: string
    stakeholderId: string
  }

  export type SignatureCountOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    stakeholderId?: SortOrder
    signedAt?: SortOrder
    ipAddress?: SortOrder
    imageData?: SortOrder
  }

  export type SignatureMaxOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    stakeholderId?: SortOrder
    signedAt?: SortOrder
    ipAddress?: SortOrder
    imageData?: SortOrder
  }

  export type SignatureMinOrderByAggregateInput = {
    id?: SortOrder
    inspectionId?: SortOrder
    stakeholderId?: SortOrder
    signedAt?: SortOrder
    ipAddress?: SortOrder
    imageData?: SortOrder
  }

  export type TenancyCreateNestedManyWithoutLandlordInput = {
    create?: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput> | TenancyCreateWithoutLandlordInput[] | TenancyUncheckedCreateWithoutLandlordInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutLandlordInput | TenancyCreateOrConnectWithoutLandlordInput[]
    createMany?: TenancyCreateManyLandlordInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type TenancyCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput> | TenancyCreateWithoutTenantInput[] | TenancyUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutTenantInput | TenancyCreateOrConnectWithoutTenantInput[]
    createMany?: TenancyCreateManyTenantInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type TenancyCreateNestedManyWithoutAgentInput = {
    create?: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput> | TenancyCreateWithoutAgentInput[] | TenancyUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutAgentInput | TenancyCreateOrConnectWithoutAgentInput[]
    createMany?: TenancyCreateManyAgentInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type InspectionCreateNestedManyWithoutConductedByInput = {
    create?: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput> | InspectionCreateWithoutConductedByInput[] | InspectionUncheckedCreateWithoutConductedByInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutConductedByInput | InspectionCreateOrConnectWithoutConductedByInput[]
    createMany?: InspectionCreateManyConductedByInputEnvelope
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
  }

  export type SignatureCreateNestedManyWithoutStakeholderInput = {
    create?: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput> | SignatureCreateWithoutStakeholderInput[] | SignatureUncheckedCreateWithoutStakeholderInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutStakeholderInput | SignatureCreateOrConnectWithoutStakeholderInput[]
    createMany?: SignatureCreateManyStakeholderInputEnvelope
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
  }

  export type TenancyUncheckedCreateNestedManyWithoutLandlordInput = {
    create?: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput> | TenancyCreateWithoutLandlordInput[] | TenancyUncheckedCreateWithoutLandlordInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutLandlordInput | TenancyCreateOrConnectWithoutLandlordInput[]
    createMany?: TenancyCreateManyLandlordInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type TenancyUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput> | TenancyCreateWithoutTenantInput[] | TenancyUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutTenantInput | TenancyCreateOrConnectWithoutTenantInput[]
    createMany?: TenancyCreateManyTenantInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type TenancyUncheckedCreateNestedManyWithoutAgentInput = {
    create?: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput> | TenancyCreateWithoutAgentInput[] | TenancyUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutAgentInput | TenancyCreateOrConnectWithoutAgentInput[]
    createMany?: TenancyCreateManyAgentInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type InspectionUncheckedCreateNestedManyWithoutConductedByInput = {
    create?: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput> | InspectionCreateWithoutConductedByInput[] | InspectionUncheckedCreateWithoutConductedByInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutConductedByInput | InspectionCreateOrConnectWithoutConductedByInput[]
    createMany?: InspectionCreateManyConductedByInputEnvelope
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
  }

  export type SignatureUncheckedCreateNestedManyWithoutStakeholderInput = {
    create?: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput> | SignatureCreateWithoutStakeholderInput[] | SignatureUncheckedCreateWithoutStakeholderInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutStakeholderInput | SignatureCreateOrConnectWithoutStakeholderInput[]
    createMany?: SignatureCreateManyStakeholderInputEnvelope
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumStakeholderKindFieldUpdateOperationsInput = {
    set?: $Enums.StakeholderKind
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type TenancyUpdateManyWithoutLandlordNestedInput = {
    create?: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput> | TenancyCreateWithoutLandlordInput[] | TenancyUncheckedCreateWithoutLandlordInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutLandlordInput | TenancyCreateOrConnectWithoutLandlordInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutLandlordInput | TenancyUpsertWithWhereUniqueWithoutLandlordInput[]
    createMany?: TenancyCreateManyLandlordInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutLandlordInput | TenancyUpdateWithWhereUniqueWithoutLandlordInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutLandlordInput | TenancyUpdateManyWithWhereWithoutLandlordInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type TenancyUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput> | TenancyCreateWithoutTenantInput[] | TenancyUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutTenantInput | TenancyCreateOrConnectWithoutTenantInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutTenantInput | TenancyUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenancyCreateManyTenantInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutTenantInput | TenancyUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutTenantInput | TenancyUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type TenancyUpdateManyWithoutAgentNestedInput = {
    create?: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput> | TenancyCreateWithoutAgentInput[] | TenancyUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutAgentInput | TenancyCreateOrConnectWithoutAgentInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutAgentInput | TenancyUpsertWithWhereUniqueWithoutAgentInput[]
    createMany?: TenancyCreateManyAgentInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutAgentInput | TenancyUpdateWithWhereUniqueWithoutAgentInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutAgentInput | TenancyUpdateManyWithWhereWithoutAgentInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type InspectionUpdateManyWithoutConductedByNestedInput = {
    create?: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput> | InspectionCreateWithoutConductedByInput[] | InspectionUncheckedCreateWithoutConductedByInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutConductedByInput | InspectionCreateOrConnectWithoutConductedByInput[]
    upsert?: InspectionUpsertWithWhereUniqueWithoutConductedByInput | InspectionUpsertWithWhereUniqueWithoutConductedByInput[]
    createMany?: InspectionCreateManyConductedByInputEnvelope
    set?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    disconnect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    delete?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    update?: InspectionUpdateWithWhereUniqueWithoutConductedByInput | InspectionUpdateWithWhereUniqueWithoutConductedByInput[]
    updateMany?: InspectionUpdateManyWithWhereWithoutConductedByInput | InspectionUpdateManyWithWhereWithoutConductedByInput[]
    deleteMany?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
  }

  export type SignatureUpdateManyWithoutStakeholderNestedInput = {
    create?: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput> | SignatureCreateWithoutStakeholderInput[] | SignatureUncheckedCreateWithoutStakeholderInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutStakeholderInput | SignatureCreateOrConnectWithoutStakeholderInput[]
    upsert?: SignatureUpsertWithWhereUniqueWithoutStakeholderInput | SignatureUpsertWithWhereUniqueWithoutStakeholderInput[]
    createMany?: SignatureCreateManyStakeholderInputEnvelope
    set?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    disconnect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    delete?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    update?: SignatureUpdateWithWhereUniqueWithoutStakeholderInput | SignatureUpdateWithWhereUniqueWithoutStakeholderInput[]
    updateMany?: SignatureUpdateManyWithWhereWithoutStakeholderInput | SignatureUpdateManyWithWhereWithoutStakeholderInput[]
    deleteMany?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
  }

  export type TenancyUncheckedUpdateManyWithoutLandlordNestedInput = {
    create?: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput> | TenancyCreateWithoutLandlordInput[] | TenancyUncheckedCreateWithoutLandlordInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutLandlordInput | TenancyCreateOrConnectWithoutLandlordInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutLandlordInput | TenancyUpsertWithWhereUniqueWithoutLandlordInput[]
    createMany?: TenancyCreateManyLandlordInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutLandlordInput | TenancyUpdateWithWhereUniqueWithoutLandlordInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutLandlordInput | TenancyUpdateManyWithWhereWithoutLandlordInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type TenancyUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput> | TenancyCreateWithoutTenantInput[] | TenancyUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutTenantInput | TenancyCreateOrConnectWithoutTenantInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutTenantInput | TenancyUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenancyCreateManyTenantInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutTenantInput | TenancyUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutTenantInput | TenancyUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type TenancyUncheckedUpdateManyWithoutAgentNestedInput = {
    create?: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput> | TenancyCreateWithoutAgentInput[] | TenancyUncheckedCreateWithoutAgentInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutAgentInput | TenancyCreateOrConnectWithoutAgentInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutAgentInput | TenancyUpsertWithWhereUniqueWithoutAgentInput[]
    createMany?: TenancyCreateManyAgentInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutAgentInput | TenancyUpdateWithWhereUniqueWithoutAgentInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutAgentInput | TenancyUpdateManyWithWhereWithoutAgentInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type InspectionUncheckedUpdateManyWithoutConductedByNestedInput = {
    create?: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput> | InspectionCreateWithoutConductedByInput[] | InspectionUncheckedCreateWithoutConductedByInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutConductedByInput | InspectionCreateOrConnectWithoutConductedByInput[]
    upsert?: InspectionUpsertWithWhereUniqueWithoutConductedByInput | InspectionUpsertWithWhereUniqueWithoutConductedByInput[]
    createMany?: InspectionCreateManyConductedByInputEnvelope
    set?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    disconnect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    delete?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    update?: InspectionUpdateWithWhereUniqueWithoutConductedByInput | InspectionUpdateWithWhereUniqueWithoutConductedByInput[]
    updateMany?: InspectionUpdateManyWithWhereWithoutConductedByInput | InspectionUpdateManyWithWhereWithoutConductedByInput[]
    deleteMany?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
  }

  export type SignatureUncheckedUpdateManyWithoutStakeholderNestedInput = {
    create?: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput> | SignatureCreateWithoutStakeholderInput[] | SignatureUncheckedCreateWithoutStakeholderInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutStakeholderInput | SignatureCreateOrConnectWithoutStakeholderInput[]
    upsert?: SignatureUpsertWithWhereUniqueWithoutStakeholderInput | SignatureUpsertWithWhereUniqueWithoutStakeholderInput[]
    createMany?: SignatureCreateManyStakeholderInputEnvelope
    set?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    disconnect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    delete?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    update?: SignatureUpdateWithWhereUniqueWithoutStakeholderInput | SignatureUpdateWithWhereUniqueWithoutStakeholderInput[]
    updateMany?: SignatureUpdateManyWithWhereWithoutStakeholderInput | SignatureUpdateManyWithWhereWithoutStakeholderInput[]
    deleteMany?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
  }

  export type TenancyCreateNestedManyWithoutPropertyInput = {
    create?: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput> | TenancyCreateWithoutPropertyInput[] | TenancyUncheckedCreateWithoutPropertyInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutPropertyInput | TenancyCreateOrConnectWithoutPropertyInput[]
    createMany?: TenancyCreateManyPropertyInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type TenancyUncheckedCreateNestedManyWithoutPropertyInput = {
    create?: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput> | TenancyCreateWithoutPropertyInput[] | TenancyUncheckedCreateWithoutPropertyInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutPropertyInput | TenancyCreateOrConnectWithoutPropertyInput[]
    createMany?: TenancyCreateManyPropertyInputEnvelope
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
  }

  export type EnumPropertyTypeFieldUpdateOperationsInput = {
    set?: $Enums.PropertyType
  }

  export type TenancyUpdateManyWithoutPropertyNestedInput = {
    create?: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput> | TenancyCreateWithoutPropertyInput[] | TenancyUncheckedCreateWithoutPropertyInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutPropertyInput | TenancyCreateOrConnectWithoutPropertyInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutPropertyInput | TenancyUpsertWithWhereUniqueWithoutPropertyInput[]
    createMany?: TenancyCreateManyPropertyInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutPropertyInput | TenancyUpdateWithWhereUniqueWithoutPropertyInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutPropertyInput | TenancyUpdateManyWithWhereWithoutPropertyInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type TenancyUncheckedUpdateManyWithoutPropertyNestedInput = {
    create?: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput> | TenancyCreateWithoutPropertyInput[] | TenancyUncheckedCreateWithoutPropertyInput[]
    connectOrCreate?: TenancyCreateOrConnectWithoutPropertyInput | TenancyCreateOrConnectWithoutPropertyInput[]
    upsert?: TenancyUpsertWithWhereUniqueWithoutPropertyInput | TenancyUpsertWithWhereUniqueWithoutPropertyInput[]
    createMany?: TenancyCreateManyPropertyInputEnvelope
    set?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    disconnect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    delete?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    connect?: TenancyWhereUniqueInput | TenancyWhereUniqueInput[]
    update?: TenancyUpdateWithWhereUniqueWithoutPropertyInput | TenancyUpdateWithWhereUniqueWithoutPropertyInput[]
    updateMany?: TenancyUpdateManyWithWhereWithoutPropertyInput | TenancyUpdateManyWithWhereWithoutPropertyInput[]
    deleteMany?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
  }

  export type PropertyCreateNestedOneWithoutTenanciesInput = {
    create?: XOR<PropertyCreateWithoutTenanciesInput, PropertyUncheckedCreateWithoutTenanciesInput>
    connectOrCreate?: PropertyCreateOrConnectWithoutTenanciesInput
    connect?: PropertyWhereUniqueInput
  }

  export type StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsLandlordInput, StakeholderUncheckedCreateWithoutTenanciesAsLandlordInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsLandlordInput
    connect?: StakeholderWhereUniqueInput
  }

  export type StakeholderCreateNestedOneWithoutTenanciesAsTenantInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsTenantInput, StakeholderUncheckedCreateWithoutTenanciesAsTenantInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsTenantInput
    connect?: StakeholderWhereUniqueInput
  }

  export type StakeholderCreateNestedOneWithoutTenanciesAsAgentInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsAgentInput, StakeholderUncheckedCreateWithoutTenanciesAsAgentInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsAgentInput
    connect?: StakeholderWhereUniqueInput
  }

  export type InspectionCreateNestedManyWithoutTenancyInput = {
    create?: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput> | InspectionCreateWithoutTenancyInput[] | InspectionUncheckedCreateWithoutTenancyInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutTenancyInput | InspectionCreateOrConnectWithoutTenancyInput[]
    createMany?: InspectionCreateManyTenancyInputEnvelope
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
  }

  export type InspectionUncheckedCreateNestedManyWithoutTenancyInput = {
    create?: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput> | InspectionCreateWithoutTenancyInput[] | InspectionUncheckedCreateWithoutTenancyInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutTenancyInput | InspectionCreateOrConnectWithoutTenancyInput[]
    createMany?: InspectionCreateManyTenancyInputEnvelope
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type PropertyUpdateOneRequiredWithoutTenanciesNestedInput = {
    create?: XOR<PropertyCreateWithoutTenanciesInput, PropertyUncheckedCreateWithoutTenanciesInput>
    connectOrCreate?: PropertyCreateOrConnectWithoutTenanciesInput
    upsert?: PropertyUpsertWithoutTenanciesInput
    connect?: PropertyWhereUniqueInput
    update?: XOR<XOR<PropertyUpdateToOneWithWhereWithoutTenanciesInput, PropertyUpdateWithoutTenanciesInput>, PropertyUncheckedUpdateWithoutTenanciesInput>
  }

  export type StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsLandlordInput, StakeholderUncheckedCreateWithoutTenanciesAsLandlordInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsLandlordInput
    upsert?: StakeholderUpsertWithoutTenanciesAsLandlordInput
    connect?: StakeholderWhereUniqueInput
    update?: XOR<XOR<StakeholderUpdateToOneWithWhereWithoutTenanciesAsLandlordInput, StakeholderUpdateWithoutTenanciesAsLandlordInput>, StakeholderUncheckedUpdateWithoutTenanciesAsLandlordInput>
  }

  export type StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsTenantInput, StakeholderUncheckedCreateWithoutTenanciesAsTenantInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsTenantInput
    upsert?: StakeholderUpsertWithoutTenanciesAsTenantInput
    connect?: StakeholderWhereUniqueInput
    update?: XOR<XOR<StakeholderUpdateToOneWithWhereWithoutTenanciesAsTenantInput, StakeholderUpdateWithoutTenanciesAsTenantInput>, StakeholderUncheckedUpdateWithoutTenanciesAsTenantInput>
  }

  export type StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput = {
    create?: XOR<StakeholderCreateWithoutTenanciesAsAgentInput, StakeholderUncheckedCreateWithoutTenanciesAsAgentInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutTenanciesAsAgentInput
    upsert?: StakeholderUpsertWithoutTenanciesAsAgentInput
    disconnect?: StakeholderWhereInput | boolean
    delete?: StakeholderWhereInput | boolean
    connect?: StakeholderWhereUniqueInput
    update?: XOR<XOR<StakeholderUpdateToOneWithWhereWithoutTenanciesAsAgentInput, StakeholderUpdateWithoutTenanciesAsAgentInput>, StakeholderUncheckedUpdateWithoutTenanciesAsAgentInput>
  }

  export type InspectionUpdateManyWithoutTenancyNestedInput = {
    create?: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput> | InspectionCreateWithoutTenancyInput[] | InspectionUncheckedCreateWithoutTenancyInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutTenancyInput | InspectionCreateOrConnectWithoutTenancyInput[]
    upsert?: InspectionUpsertWithWhereUniqueWithoutTenancyInput | InspectionUpsertWithWhereUniqueWithoutTenancyInput[]
    createMany?: InspectionCreateManyTenancyInputEnvelope
    set?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    disconnect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    delete?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    update?: InspectionUpdateWithWhereUniqueWithoutTenancyInput | InspectionUpdateWithWhereUniqueWithoutTenancyInput[]
    updateMany?: InspectionUpdateManyWithWhereWithoutTenancyInput | InspectionUpdateManyWithWhereWithoutTenancyInput[]
    deleteMany?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
  }

  export type InspectionUncheckedUpdateManyWithoutTenancyNestedInput = {
    create?: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput> | InspectionCreateWithoutTenancyInput[] | InspectionUncheckedCreateWithoutTenancyInput[]
    connectOrCreate?: InspectionCreateOrConnectWithoutTenancyInput | InspectionCreateOrConnectWithoutTenancyInput[]
    upsert?: InspectionUpsertWithWhereUniqueWithoutTenancyInput | InspectionUpsertWithWhereUniqueWithoutTenancyInput[]
    createMany?: InspectionCreateManyTenancyInputEnvelope
    set?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    disconnect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    delete?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    connect?: InspectionWhereUniqueInput | InspectionWhereUniqueInput[]
    update?: InspectionUpdateWithWhereUniqueWithoutTenancyInput | InspectionUpdateWithWhereUniqueWithoutTenancyInput[]
    updateMany?: InspectionUpdateManyWithWhereWithoutTenancyInput | InspectionUpdateManyWithWhereWithoutTenancyInput[]
    deleteMany?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
  }

  export type TenancyCreateNestedOneWithoutInspectionsInput = {
    create?: XOR<TenancyCreateWithoutInspectionsInput, TenancyUncheckedCreateWithoutInspectionsInput>
    connectOrCreate?: TenancyCreateOrConnectWithoutInspectionsInput
    connect?: TenancyWhereUniqueInput
  }

  export type StakeholderCreateNestedOneWithoutInspectionsRunInput = {
    create?: XOR<StakeholderCreateWithoutInspectionsRunInput, StakeholderUncheckedCreateWithoutInspectionsRunInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutInspectionsRunInput
    connect?: StakeholderWhereUniqueInput
  }

  export type InspectionCreateNestedOneWithoutCheckOutInput = {
    create?: XOR<InspectionCreateWithoutCheckOutInput, InspectionUncheckedCreateWithoutCheckOutInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutCheckOutInput
    connect?: InspectionWhereUniqueInput
  }

  export type InspectionCreateNestedOneWithoutBaselineInput = {
    create?: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutBaselineInput
    connect?: InspectionWhereUniqueInput
  }

  export type RoomCreateNestedManyWithoutInspectionInput = {
    create?: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput> | RoomCreateWithoutInspectionInput[] | RoomUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutInspectionInput | RoomCreateOrConnectWithoutInspectionInput[]
    createMany?: RoomCreateManyInspectionInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type FindingCreateNestedManyWithoutInspectionInput = {
    create?: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput> | FindingCreateWithoutInspectionInput[] | FindingUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutInspectionInput | FindingCreateOrConnectWithoutInspectionInput[]
    createMany?: FindingCreateManyInspectionInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type SignatureCreateNestedManyWithoutInspectionInput = {
    create?: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput> | SignatureCreateWithoutInspectionInput[] | SignatureUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutInspectionInput | SignatureCreateOrConnectWithoutInspectionInput[]
    createMany?: SignatureCreateManyInspectionInputEnvelope
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
  }

  export type InspectionUncheckedCreateNestedOneWithoutBaselineInput = {
    create?: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutBaselineInput
    connect?: InspectionWhereUniqueInput
  }

  export type RoomUncheckedCreateNestedManyWithoutInspectionInput = {
    create?: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput> | RoomCreateWithoutInspectionInput[] | RoomUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutInspectionInput | RoomCreateOrConnectWithoutInspectionInput[]
    createMany?: RoomCreateManyInspectionInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type FindingUncheckedCreateNestedManyWithoutInspectionInput = {
    create?: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput> | FindingCreateWithoutInspectionInput[] | FindingUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutInspectionInput | FindingCreateOrConnectWithoutInspectionInput[]
    createMany?: FindingCreateManyInspectionInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type SignatureUncheckedCreateNestedManyWithoutInspectionInput = {
    create?: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput> | SignatureCreateWithoutInspectionInput[] | SignatureUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutInspectionInput | SignatureCreateOrConnectWithoutInspectionInput[]
    createMany?: SignatureCreateManyInspectionInputEnvelope
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
  }

  export type EnumInspectionKindFieldUpdateOperationsInput = {
    set?: $Enums.InspectionKind
  }

  export type EnumInspectionStatusFieldUpdateOperationsInput = {
    set?: $Enums.InspectionStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type TenancyUpdateOneRequiredWithoutInspectionsNestedInput = {
    create?: XOR<TenancyCreateWithoutInspectionsInput, TenancyUncheckedCreateWithoutInspectionsInput>
    connectOrCreate?: TenancyCreateOrConnectWithoutInspectionsInput
    upsert?: TenancyUpsertWithoutInspectionsInput
    connect?: TenancyWhereUniqueInput
    update?: XOR<XOR<TenancyUpdateToOneWithWhereWithoutInspectionsInput, TenancyUpdateWithoutInspectionsInput>, TenancyUncheckedUpdateWithoutInspectionsInput>
  }

  export type StakeholderUpdateOneWithoutInspectionsRunNestedInput = {
    create?: XOR<StakeholderCreateWithoutInspectionsRunInput, StakeholderUncheckedCreateWithoutInspectionsRunInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutInspectionsRunInput
    upsert?: StakeholderUpsertWithoutInspectionsRunInput
    disconnect?: StakeholderWhereInput | boolean
    delete?: StakeholderWhereInput | boolean
    connect?: StakeholderWhereUniqueInput
    update?: XOR<XOR<StakeholderUpdateToOneWithWhereWithoutInspectionsRunInput, StakeholderUpdateWithoutInspectionsRunInput>, StakeholderUncheckedUpdateWithoutInspectionsRunInput>
  }

  export type InspectionUpdateOneWithoutCheckOutNestedInput = {
    create?: XOR<InspectionCreateWithoutCheckOutInput, InspectionUncheckedCreateWithoutCheckOutInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutCheckOutInput
    upsert?: InspectionUpsertWithoutCheckOutInput
    disconnect?: InspectionWhereInput | boolean
    delete?: InspectionWhereInput | boolean
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutCheckOutInput, InspectionUpdateWithoutCheckOutInput>, InspectionUncheckedUpdateWithoutCheckOutInput>
  }

  export type InspectionUpdateOneWithoutBaselineNestedInput = {
    create?: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutBaselineInput
    upsert?: InspectionUpsertWithoutBaselineInput
    disconnect?: InspectionWhereInput | boolean
    delete?: InspectionWhereInput | boolean
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutBaselineInput, InspectionUpdateWithoutBaselineInput>, InspectionUncheckedUpdateWithoutBaselineInput>
  }

  export type RoomUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput> | RoomCreateWithoutInspectionInput[] | RoomUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutInspectionInput | RoomCreateOrConnectWithoutInspectionInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutInspectionInput | RoomUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: RoomCreateManyInspectionInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutInspectionInput | RoomUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutInspectionInput | RoomUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type FindingUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput> | FindingCreateWithoutInspectionInput[] | FindingUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutInspectionInput | FindingCreateOrConnectWithoutInspectionInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutInspectionInput | FindingUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: FindingCreateManyInspectionInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutInspectionInput | FindingUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutInspectionInput | FindingUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type SignatureUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput> | SignatureCreateWithoutInspectionInput[] | SignatureUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutInspectionInput | SignatureCreateOrConnectWithoutInspectionInput[]
    upsert?: SignatureUpsertWithWhereUniqueWithoutInspectionInput | SignatureUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: SignatureCreateManyInspectionInputEnvelope
    set?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    disconnect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    delete?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    update?: SignatureUpdateWithWhereUniqueWithoutInspectionInput | SignatureUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: SignatureUpdateManyWithWhereWithoutInspectionInput | SignatureUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
  }

  export type InspectionUncheckedUpdateOneWithoutBaselineNestedInput = {
    create?: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutBaselineInput
    upsert?: InspectionUpsertWithoutBaselineInput
    disconnect?: InspectionWhereInput | boolean
    delete?: InspectionWhereInput | boolean
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutBaselineInput, InspectionUpdateWithoutBaselineInput>, InspectionUncheckedUpdateWithoutBaselineInput>
  }

  export type RoomUncheckedUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput> | RoomCreateWithoutInspectionInput[] | RoomUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutInspectionInput | RoomCreateOrConnectWithoutInspectionInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutInspectionInput | RoomUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: RoomCreateManyInspectionInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutInspectionInput | RoomUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutInspectionInput | RoomUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type FindingUncheckedUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput> | FindingCreateWithoutInspectionInput[] | FindingUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutInspectionInput | FindingCreateOrConnectWithoutInspectionInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutInspectionInput | FindingUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: FindingCreateManyInspectionInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutInspectionInput | FindingUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutInspectionInput | FindingUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type SignatureUncheckedUpdateManyWithoutInspectionNestedInput = {
    create?: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput> | SignatureCreateWithoutInspectionInput[] | SignatureUncheckedCreateWithoutInspectionInput[]
    connectOrCreate?: SignatureCreateOrConnectWithoutInspectionInput | SignatureCreateOrConnectWithoutInspectionInput[]
    upsert?: SignatureUpsertWithWhereUniqueWithoutInspectionInput | SignatureUpsertWithWhereUniqueWithoutInspectionInput[]
    createMany?: SignatureCreateManyInspectionInputEnvelope
    set?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    disconnect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    delete?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    connect?: SignatureWhereUniqueInput | SignatureWhereUniqueInput[]
    update?: SignatureUpdateWithWhereUniqueWithoutInspectionInput | SignatureUpdateWithWhereUniqueWithoutInspectionInput[]
    updateMany?: SignatureUpdateManyWithWhereWithoutInspectionInput | SignatureUpdateManyWithWhereWithoutInspectionInput[]
    deleteMany?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
  }

  export type RoomCreateNestedOneWithoutCapturesInput = {
    create?: XOR<RoomCreateWithoutCapturesInput, RoomUncheckedCreateWithoutCapturesInput>
    connectOrCreate?: RoomCreateOrConnectWithoutCapturesInput
    connect?: RoomWhereUniqueInput
  }

  export type InspectionItemCreateNestedManyWithoutSourceCaptureInput = {
    create?: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput> | InspectionItemCreateWithoutSourceCaptureInput[] | InspectionItemUncheckedCreateWithoutSourceCaptureInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutSourceCaptureInput | InspectionItemCreateOrConnectWithoutSourceCaptureInput[]
    createMany?: InspectionItemCreateManySourceCaptureInputEnvelope
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
  }

  export type InspectionItemUncheckedCreateNestedManyWithoutSourceCaptureInput = {
    create?: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput> | InspectionItemCreateWithoutSourceCaptureInput[] | InspectionItemUncheckedCreateWithoutSourceCaptureInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutSourceCaptureInput | InspectionItemCreateOrConnectWithoutSourceCaptureInput[]
    createMany?: InspectionItemCreateManySourceCaptureInputEnvelope
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
  }

  export type EnumCaptureKindFieldUpdateOperationsInput = {
    set?: $Enums.CaptureKind
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type RoomUpdateOneRequiredWithoutCapturesNestedInput = {
    create?: XOR<RoomCreateWithoutCapturesInput, RoomUncheckedCreateWithoutCapturesInput>
    connectOrCreate?: RoomCreateOrConnectWithoutCapturesInput
    upsert?: RoomUpsertWithoutCapturesInput
    connect?: RoomWhereUniqueInput
    update?: XOR<XOR<RoomUpdateToOneWithWhereWithoutCapturesInput, RoomUpdateWithoutCapturesInput>, RoomUncheckedUpdateWithoutCapturesInput>
  }

  export type InspectionItemUpdateManyWithoutSourceCaptureNestedInput = {
    create?: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput> | InspectionItemCreateWithoutSourceCaptureInput[] | InspectionItemUncheckedCreateWithoutSourceCaptureInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutSourceCaptureInput | InspectionItemCreateOrConnectWithoutSourceCaptureInput[]
    upsert?: InspectionItemUpsertWithWhereUniqueWithoutSourceCaptureInput | InspectionItemUpsertWithWhereUniqueWithoutSourceCaptureInput[]
    createMany?: InspectionItemCreateManySourceCaptureInputEnvelope
    set?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    disconnect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    delete?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    update?: InspectionItemUpdateWithWhereUniqueWithoutSourceCaptureInput | InspectionItemUpdateWithWhereUniqueWithoutSourceCaptureInput[]
    updateMany?: InspectionItemUpdateManyWithWhereWithoutSourceCaptureInput | InspectionItemUpdateManyWithWhereWithoutSourceCaptureInput[]
    deleteMany?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
  }

  export type InspectionItemUncheckedUpdateManyWithoutSourceCaptureNestedInput = {
    create?: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput> | InspectionItemCreateWithoutSourceCaptureInput[] | InspectionItemUncheckedCreateWithoutSourceCaptureInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutSourceCaptureInput | InspectionItemCreateOrConnectWithoutSourceCaptureInput[]
    upsert?: InspectionItemUpsertWithWhereUniqueWithoutSourceCaptureInput | InspectionItemUpsertWithWhereUniqueWithoutSourceCaptureInput[]
    createMany?: InspectionItemCreateManySourceCaptureInputEnvelope
    set?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    disconnect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    delete?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    update?: InspectionItemUpdateWithWhereUniqueWithoutSourceCaptureInput | InspectionItemUpdateWithWhereUniqueWithoutSourceCaptureInput[]
    updateMany?: InspectionItemUpdateManyWithWhereWithoutSourceCaptureInput | InspectionItemUpdateManyWithWhereWithoutSourceCaptureInput[]
    deleteMany?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
  }

  export type InspectionCreateNestedOneWithoutRoomsInput = {
    create?: XOR<InspectionCreateWithoutRoomsInput, InspectionUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutRoomsInput
    connect?: InspectionWhereUniqueInput
  }

  export type CaptureCreateNestedManyWithoutRoomInput = {
    create?: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput> | CaptureCreateWithoutRoomInput[] | CaptureUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: CaptureCreateOrConnectWithoutRoomInput | CaptureCreateOrConnectWithoutRoomInput[]
    createMany?: CaptureCreateManyRoomInputEnvelope
    connect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
  }

  export type InspectionItemCreateNestedManyWithoutRoomInput = {
    create?: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput> | InspectionItemCreateWithoutRoomInput[] | InspectionItemUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutRoomInput | InspectionItemCreateOrConnectWithoutRoomInput[]
    createMany?: InspectionItemCreateManyRoomInputEnvelope
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
  }

  export type CaptureUncheckedCreateNestedManyWithoutRoomInput = {
    create?: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput> | CaptureCreateWithoutRoomInput[] | CaptureUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: CaptureCreateOrConnectWithoutRoomInput | CaptureCreateOrConnectWithoutRoomInput[]
    createMany?: CaptureCreateManyRoomInputEnvelope
    connect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
  }

  export type InspectionItemUncheckedCreateNestedManyWithoutRoomInput = {
    create?: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput> | InspectionItemCreateWithoutRoomInput[] | InspectionItemUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutRoomInput | InspectionItemCreateOrConnectWithoutRoomInput[]
    createMany?: InspectionItemCreateManyRoomInputEnvelope
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
  }

  export type EnumRoomStatusFieldUpdateOperationsInput = {
    set?: $Enums.RoomStatus
  }

  export type InspectionUpdateOneRequiredWithoutRoomsNestedInput = {
    create?: XOR<InspectionCreateWithoutRoomsInput, InspectionUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutRoomsInput
    upsert?: InspectionUpsertWithoutRoomsInput
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutRoomsInput, InspectionUpdateWithoutRoomsInput>, InspectionUncheckedUpdateWithoutRoomsInput>
  }

  export type CaptureUpdateManyWithoutRoomNestedInput = {
    create?: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput> | CaptureCreateWithoutRoomInput[] | CaptureUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: CaptureCreateOrConnectWithoutRoomInput | CaptureCreateOrConnectWithoutRoomInput[]
    upsert?: CaptureUpsertWithWhereUniqueWithoutRoomInput | CaptureUpsertWithWhereUniqueWithoutRoomInput[]
    createMany?: CaptureCreateManyRoomInputEnvelope
    set?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    disconnect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    delete?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    connect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    update?: CaptureUpdateWithWhereUniqueWithoutRoomInput | CaptureUpdateWithWhereUniqueWithoutRoomInput[]
    updateMany?: CaptureUpdateManyWithWhereWithoutRoomInput | CaptureUpdateManyWithWhereWithoutRoomInput[]
    deleteMany?: CaptureScalarWhereInput | CaptureScalarWhereInput[]
  }

  export type InspectionItemUpdateManyWithoutRoomNestedInput = {
    create?: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput> | InspectionItemCreateWithoutRoomInput[] | InspectionItemUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutRoomInput | InspectionItemCreateOrConnectWithoutRoomInput[]
    upsert?: InspectionItemUpsertWithWhereUniqueWithoutRoomInput | InspectionItemUpsertWithWhereUniqueWithoutRoomInput[]
    createMany?: InspectionItemCreateManyRoomInputEnvelope
    set?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    disconnect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    delete?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    update?: InspectionItemUpdateWithWhereUniqueWithoutRoomInput | InspectionItemUpdateWithWhereUniqueWithoutRoomInput[]
    updateMany?: InspectionItemUpdateManyWithWhereWithoutRoomInput | InspectionItemUpdateManyWithWhereWithoutRoomInput[]
    deleteMany?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
  }

  export type CaptureUncheckedUpdateManyWithoutRoomNestedInput = {
    create?: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput> | CaptureCreateWithoutRoomInput[] | CaptureUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: CaptureCreateOrConnectWithoutRoomInput | CaptureCreateOrConnectWithoutRoomInput[]
    upsert?: CaptureUpsertWithWhereUniqueWithoutRoomInput | CaptureUpsertWithWhereUniqueWithoutRoomInput[]
    createMany?: CaptureCreateManyRoomInputEnvelope
    set?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    disconnect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    delete?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    connect?: CaptureWhereUniqueInput | CaptureWhereUniqueInput[]
    update?: CaptureUpdateWithWhereUniqueWithoutRoomInput | CaptureUpdateWithWhereUniqueWithoutRoomInput[]
    updateMany?: CaptureUpdateManyWithWhereWithoutRoomInput | CaptureUpdateManyWithWhereWithoutRoomInput[]
    deleteMany?: CaptureScalarWhereInput | CaptureScalarWhereInput[]
  }

  export type InspectionItemUncheckedUpdateManyWithoutRoomNestedInput = {
    create?: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput> | InspectionItemCreateWithoutRoomInput[] | InspectionItemUncheckedCreateWithoutRoomInput[]
    connectOrCreate?: InspectionItemCreateOrConnectWithoutRoomInput | InspectionItemCreateOrConnectWithoutRoomInput[]
    upsert?: InspectionItemUpsertWithWhereUniqueWithoutRoomInput | InspectionItemUpsertWithWhereUniqueWithoutRoomInput[]
    createMany?: InspectionItemCreateManyRoomInputEnvelope
    set?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    disconnect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    delete?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    connect?: InspectionItemWhereUniqueInput | InspectionItemWhereUniqueInput[]
    update?: InspectionItemUpdateWithWhereUniqueWithoutRoomInput | InspectionItemUpdateWithWhereUniqueWithoutRoomInput[]
    updateMany?: InspectionItemUpdateManyWithWhereWithoutRoomInput | InspectionItemUpdateManyWithWhereWithoutRoomInput[]
    deleteMany?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
  }

  export type RoomCreateNestedOneWithoutItemsInput = {
    create?: XOR<RoomCreateWithoutItemsInput, RoomUncheckedCreateWithoutItemsInput>
    connectOrCreate?: RoomCreateOrConnectWithoutItemsInput
    connect?: RoomWhereUniqueInput
  }

  export type CaptureCreateNestedOneWithoutItemsInput = {
    create?: XOR<CaptureCreateWithoutItemsInput, CaptureUncheckedCreateWithoutItemsInput>
    connectOrCreate?: CaptureCreateOrConnectWithoutItemsInput
    connect?: CaptureWhereUniqueInput
  }

  export type FindingCreateNestedManyWithoutItemInput = {
    create?: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput> | FindingCreateWithoutItemInput[] | FindingUncheckedCreateWithoutItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutItemInput | FindingCreateOrConnectWithoutItemInput[]
    createMany?: FindingCreateManyItemInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type FindingCreateNestedManyWithoutBaselineItemInput = {
    create?: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput> | FindingCreateWithoutBaselineItemInput[] | FindingUncheckedCreateWithoutBaselineItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutBaselineItemInput | FindingCreateOrConnectWithoutBaselineItemInput[]
    createMany?: FindingCreateManyBaselineItemInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type FindingUncheckedCreateNestedManyWithoutItemInput = {
    create?: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput> | FindingCreateWithoutItemInput[] | FindingUncheckedCreateWithoutItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutItemInput | FindingCreateOrConnectWithoutItemInput[]
    createMany?: FindingCreateManyItemInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type FindingUncheckedCreateNestedManyWithoutBaselineItemInput = {
    create?: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput> | FindingCreateWithoutBaselineItemInput[] | FindingUncheckedCreateWithoutBaselineItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutBaselineItemInput | FindingCreateOrConnectWithoutBaselineItemInput[]
    createMany?: FindingCreateManyBaselineItemInputEnvelope
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
  }

  export type EnumItemCategoryFieldUpdateOperationsInput = {
    set?: $Enums.ItemCategory
  }

  export type EnumItemConditionFieldUpdateOperationsInput = {
    set?: $Enums.ItemCondition
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type RoomUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<RoomCreateWithoutItemsInput, RoomUncheckedCreateWithoutItemsInput>
    connectOrCreate?: RoomCreateOrConnectWithoutItemsInput
    upsert?: RoomUpsertWithoutItemsInput
    connect?: RoomWhereUniqueInput
    update?: XOR<XOR<RoomUpdateToOneWithWhereWithoutItemsInput, RoomUpdateWithoutItemsInput>, RoomUncheckedUpdateWithoutItemsInput>
  }

  export type CaptureUpdateOneWithoutItemsNestedInput = {
    create?: XOR<CaptureCreateWithoutItemsInput, CaptureUncheckedCreateWithoutItemsInput>
    connectOrCreate?: CaptureCreateOrConnectWithoutItemsInput
    upsert?: CaptureUpsertWithoutItemsInput
    disconnect?: CaptureWhereInput | boolean
    delete?: CaptureWhereInput | boolean
    connect?: CaptureWhereUniqueInput
    update?: XOR<XOR<CaptureUpdateToOneWithWhereWithoutItemsInput, CaptureUpdateWithoutItemsInput>, CaptureUncheckedUpdateWithoutItemsInput>
  }

  export type FindingUpdateManyWithoutItemNestedInput = {
    create?: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput> | FindingCreateWithoutItemInput[] | FindingUncheckedCreateWithoutItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutItemInput | FindingCreateOrConnectWithoutItemInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutItemInput | FindingUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: FindingCreateManyItemInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutItemInput | FindingUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutItemInput | FindingUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type FindingUpdateManyWithoutBaselineItemNestedInput = {
    create?: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput> | FindingCreateWithoutBaselineItemInput[] | FindingUncheckedCreateWithoutBaselineItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutBaselineItemInput | FindingCreateOrConnectWithoutBaselineItemInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutBaselineItemInput | FindingUpsertWithWhereUniqueWithoutBaselineItemInput[]
    createMany?: FindingCreateManyBaselineItemInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutBaselineItemInput | FindingUpdateWithWhereUniqueWithoutBaselineItemInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutBaselineItemInput | FindingUpdateManyWithWhereWithoutBaselineItemInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type FindingUncheckedUpdateManyWithoutItemNestedInput = {
    create?: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput> | FindingCreateWithoutItemInput[] | FindingUncheckedCreateWithoutItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutItemInput | FindingCreateOrConnectWithoutItemInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutItemInput | FindingUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: FindingCreateManyItemInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutItemInput | FindingUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutItemInput | FindingUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type FindingUncheckedUpdateManyWithoutBaselineItemNestedInput = {
    create?: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput> | FindingCreateWithoutBaselineItemInput[] | FindingUncheckedCreateWithoutBaselineItemInput[]
    connectOrCreate?: FindingCreateOrConnectWithoutBaselineItemInput | FindingCreateOrConnectWithoutBaselineItemInput[]
    upsert?: FindingUpsertWithWhereUniqueWithoutBaselineItemInput | FindingUpsertWithWhereUniqueWithoutBaselineItemInput[]
    createMany?: FindingCreateManyBaselineItemInputEnvelope
    set?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    disconnect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    delete?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    connect?: FindingWhereUniqueInput | FindingWhereUniqueInput[]
    update?: FindingUpdateWithWhereUniqueWithoutBaselineItemInput | FindingUpdateWithWhereUniqueWithoutBaselineItemInput[]
    updateMany?: FindingUpdateManyWithWhereWithoutBaselineItemInput | FindingUpdateManyWithWhereWithoutBaselineItemInput[]
    deleteMany?: FindingScalarWhereInput | FindingScalarWhereInput[]
  }

  export type InspectionCreateNestedOneWithoutFindingsInput = {
    create?: XOR<InspectionCreateWithoutFindingsInput, InspectionUncheckedCreateWithoutFindingsInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutFindingsInput
    connect?: InspectionWhereUniqueInput
  }

  export type InspectionItemCreateNestedOneWithoutFindingsAsSubjectInput = {
    create?: XOR<InspectionItemCreateWithoutFindingsAsSubjectInput, InspectionItemUncheckedCreateWithoutFindingsAsSubjectInput>
    connectOrCreate?: InspectionItemCreateOrConnectWithoutFindingsAsSubjectInput
    connect?: InspectionItemWhereUniqueInput
  }

  export type InspectionItemCreateNestedOneWithoutFindingsAsBaselineInput = {
    create?: XOR<InspectionItemCreateWithoutFindingsAsBaselineInput, InspectionItemUncheckedCreateWithoutFindingsAsBaselineInput>
    connectOrCreate?: InspectionItemCreateOrConnectWithoutFindingsAsBaselineInput
    connect?: InspectionItemWhereUniqueInput
  }

  export type EnumChangeTypeFieldUpdateOperationsInput = {
    set?: $Enums.ChangeType
  }

  export type EnumVerdictFieldUpdateOperationsInput = {
    set?: $Enums.Verdict
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type InspectionUpdateOneRequiredWithoutFindingsNestedInput = {
    create?: XOR<InspectionCreateWithoutFindingsInput, InspectionUncheckedCreateWithoutFindingsInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutFindingsInput
    upsert?: InspectionUpsertWithoutFindingsInput
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutFindingsInput, InspectionUpdateWithoutFindingsInput>, InspectionUncheckedUpdateWithoutFindingsInput>
  }

  export type InspectionItemUpdateOneWithoutFindingsAsSubjectNestedInput = {
    create?: XOR<InspectionItemCreateWithoutFindingsAsSubjectInput, InspectionItemUncheckedCreateWithoutFindingsAsSubjectInput>
    connectOrCreate?: InspectionItemCreateOrConnectWithoutFindingsAsSubjectInput
    upsert?: InspectionItemUpsertWithoutFindingsAsSubjectInput
    disconnect?: InspectionItemWhereInput | boolean
    delete?: InspectionItemWhereInput | boolean
    connect?: InspectionItemWhereUniqueInput
    update?: XOR<XOR<InspectionItemUpdateToOneWithWhereWithoutFindingsAsSubjectInput, InspectionItemUpdateWithoutFindingsAsSubjectInput>, InspectionItemUncheckedUpdateWithoutFindingsAsSubjectInput>
  }

  export type InspectionItemUpdateOneWithoutFindingsAsBaselineNestedInput = {
    create?: XOR<InspectionItemCreateWithoutFindingsAsBaselineInput, InspectionItemUncheckedCreateWithoutFindingsAsBaselineInput>
    connectOrCreate?: InspectionItemCreateOrConnectWithoutFindingsAsBaselineInput
    upsert?: InspectionItemUpsertWithoutFindingsAsBaselineInput
    disconnect?: InspectionItemWhereInput | boolean
    delete?: InspectionItemWhereInput | boolean
    connect?: InspectionItemWhereUniqueInput
    update?: XOR<XOR<InspectionItemUpdateToOneWithWhereWithoutFindingsAsBaselineInput, InspectionItemUpdateWithoutFindingsAsBaselineInput>, InspectionItemUncheckedUpdateWithoutFindingsAsBaselineInput>
  }

  export type InspectionCreateNestedOneWithoutSignaturesInput = {
    create?: XOR<InspectionCreateWithoutSignaturesInput, InspectionUncheckedCreateWithoutSignaturesInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutSignaturesInput
    connect?: InspectionWhereUniqueInput
  }

  export type StakeholderCreateNestedOneWithoutSignaturesInput = {
    create?: XOR<StakeholderCreateWithoutSignaturesInput, StakeholderUncheckedCreateWithoutSignaturesInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutSignaturesInput
    connect?: StakeholderWhereUniqueInput
  }

  export type InspectionUpdateOneRequiredWithoutSignaturesNestedInput = {
    create?: XOR<InspectionCreateWithoutSignaturesInput, InspectionUncheckedCreateWithoutSignaturesInput>
    connectOrCreate?: InspectionCreateOrConnectWithoutSignaturesInput
    upsert?: InspectionUpsertWithoutSignaturesInput
    connect?: InspectionWhereUniqueInput
    update?: XOR<XOR<InspectionUpdateToOneWithWhereWithoutSignaturesInput, InspectionUpdateWithoutSignaturesInput>, InspectionUncheckedUpdateWithoutSignaturesInput>
  }

  export type StakeholderUpdateOneRequiredWithoutSignaturesNestedInput = {
    create?: XOR<StakeholderCreateWithoutSignaturesInput, StakeholderUncheckedCreateWithoutSignaturesInput>
    connectOrCreate?: StakeholderCreateOrConnectWithoutSignaturesInput
    upsert?: StakeholderUpsertWithoutSignaturesInput
    connect?: StakeholderWhereUniqueInput
    update?: XOR<XOR<StakeholderUpdateToOneWithWhereWithoutSignaturesInput, StakeholderUpdateWithoutSignaturesInput>, StakeholderUncheckedUpdateWithoutSignaturesInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumStakeholderKindFilter<$PrismaModel = never> = {
    equals?: $Enums.StakeholderKind | EnumStakeholderKindFieldRefInput<$PrismaModel>
    in?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumStakeholderKindFilter<$PrismaModel> | $Enums.StakeholderKind
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumStakeholderKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.StakeholderKind | EnumStakeholderKindFieldRefInput<$PrismaModel>
    in?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.StakeholderKind[] | ListEnumStakeholderKindFieldRefInput<$PrismaModel>
    not?: NestedEnumStakeholderKindWithAggregatesFilter<$PrismaModel> | $Enums.StakeholderKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumStakeholderKindFilter<$PrismaModel>
    _max?: NestedEnumStakeholderKindFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumPropertyTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.PropertyType | EnumPropertyTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumPropertyTypeFilter<$PrismaModel> | $Enums.PropertyType
  }

  export type NestedEnumPropertyTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PropertyType | EnumPropertyTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.PropertyType[] | ListEnumPropertyTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumPropertyTypeWithAggregatesFilter<$PrismaModel> | $Enums.PropertyType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPropertyTypeFilter<$PrismaModel>
    _max?: NestedEnumPropertyTypeFilter<$PrismaModel>
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumInspectionKindFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionKind | EnumInspectionKindFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionKindFilter<$PrismaModel> | $Enums.InspectionKind
  }

  export type NestedEnumInspectionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionStatus | EnumInspectionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionStatusFilter<$PrismaModel> | $Enums.InspectionStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumInspectionKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionKind | EnumInspectionKindFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionKind[] | ListEnumInspectionKindFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionKindWithAggregatesFilter<$PrismaModel> | $Enums.InspectionKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInspectionKindFilter<$PrismaModel>
    _max?: NestedEnumInspectionKindFilter<$PrismaModel>
  }

  export type NestedEnumInspectionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InspectionStatus | EnumInspectionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InspectionStatus[] | ListEnumInspectionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInspectionStatusWithAggregatesFilter<$PrismaModel> | $Enums.InspectionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInspectionStatusFilter<$PrismaModel>
    _max?: NestedEnumInspectionStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumCaptureKindFilter<$PrismaModel = never> = {
    equals?: $Enums.CaptureKind | EnumCaptureKindFieldRefInput<$PrismaModel>
    in?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    not?: NestedEnumCaptureKindFilter<$PrismaModel> | $Enums.CaptureKind
  }

  export type NestedEnumCaptureKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CaptureKind | EnumCaptureKindFieldRefInput<$PrismaModel>
    in?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.CaptureKind[] | ListEnumCaptureKindFieldRefInput<$PrismaModel>
    not?: NestedEnumCaptureKindWithAggregatesFilter<$PrismaModel> | $Enums.CaptureKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCaptureKindFilter<$PrismaModel>
    _max?: NestedEnumCaptureKindFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumRoomStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RoomStatus | EnumRoomStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRoomStatusFilter<$PrismaModel> | $Enums.RoomStatus
  }

  export type NestedEnumRoomStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoomStatus | EnumRoomStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoomStatus[] | ListEnumRoomStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRoomStatusWithAggregatesFilter<$PrismaModel> | $Enums.RoomStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoomStatusFilter<$PrismaModel>
    _max?: NestedEnumRoomStatusFilter<$PrismaModel>
  }

  export type NestedEnumItemCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCategory | EnumItemCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumItemCategoryFilter<$PrismaModel> | $Enums.ItemCategory
  }

  export type NestedEnumItemConditionFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCondition | EnumItemConditionFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    not?: NestedEnumItemConditionFilter<$PrismaModel> | $Enums.ItemCondition
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumItemCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCategory | EnumItemCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCategory[] | ListEnumItemCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumItemCategoryWithAggregatesFilter<$PrismaModel> | $Enums.ItemCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemCategoryFilter<$PrismaModel>
    _max?: NestedEnumItemCategoryFilter<$PrismaModel>
  }

  export type NestedEnumItemConditionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemCondition | EnumItemConditionFieldRefInput<$PrismaModel>
    in?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemCondition[] | ListEnumItemConditionFieldRefInput<$PrismaModel>
    not?: NestedEnumItemConditionWithAggregatesFilter<$PrismaModel> | $Enums.ItemCondition
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemConditionFilter<$PrismaModel>
    _max?: NestedEnumItemConditionFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumChangeTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ChangeType | EnumChangeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChangeTypeFilter<$PrismaModel> | $Enums.ChangeType
  }

  export type NestedEnumVerdictFilter<$PrismaModel = never> = {
    equals?: $Enums.Verdict | EnumVerdictFieldRefInput<$PrismaModel>
    in?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    notIn?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    not?: NestedEnumVerdictFilter<$PrismaModel> | $Enums.Verdict
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumChangeTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ChangeType | EnumChangeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChangeType[] | ListEnumChangeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChangeTypeWithAggregatesFilter<$PrismaModel> | $Enums.ChangeType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumChangeTypeFilter<$PrismaModel>
    _max?: NestedEnumChangeTypeFilter<$PrismaModel>
  }

  export type NestedEnumVerdictWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Verdict | EnumVerdictFieldRefInput<$PrismaModel>
    in?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    notIn?: $Enums.Verdict[] | ListEnumVerdictFieldRefInput<$PrismaModel>
    not?: NestedEnumVerdictWithAggregatesFilter<$PrismaModel> | $Enums.Verdict
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVerdictFilter<$PrismaModel>
    _max?: NestedEnumVerdictFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type TenancyCreateWithoutLandlordInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    property: PropertyCreateNestedOneWithoutTenanciesInput
    tenant: StakeholderCreateNestedOneWithoutTenanciesAsTenantInput
    agent?: StakeholderCreateNestedOneWithoutTenanciesAsAgentInput
    inspections?: InspectionCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUncheckedCreateWithoutLandlordInput = {
    id?: string
    propertyId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    inspections?: InspectionUncheckedCreateNestedManyWithoutTenancyInput
  }

  export type TenancyCreateOrConnectWithoutLandlordInput = {
    where: TenancyWhereUniqueInput
    create: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput>
  }

  export type TenancyCreateManyLandlordInputEnvelope = {
    data: TenancyCreateManyLandlordInput | TenancyCreateManyLandlordInput[]
    skipDuplicates?: boolean
  }

  export type TenancyCreateWithoutTenantInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    property: PropertyCreateNestedOneWithoutTenanciesInput
    landlord: StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput
    agent?: StakeholderCreateNestedOneWithoutTenanciesAsAgentInput
    inspections?: InspectionCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUncheckedCreateWithoutTenantInput = {
    id?: string
    propertyId: string
    landlordId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    inspections?: InspectionUncheckedCreateNestedManyWithoutTenancyInput
  }

  export type TenancyCreateOrConnectWithoutTenantInput = {
    where: TenancyWhereUniqueInput
    create: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput>
  }

  export type TenancyCreateManyTenantInputEnvelope = {
    data: TenancyCreateManyTenantInput | TenancyCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type TenancyCreateWithoutAgentInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    property: PropertyCreateNestedOneWithoutTenanciesInput
    landlord: StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput
    tenant: StakeholderCreateNestedOneWithoutTenanciesAsTenantInput
    inspections?: InspectionCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUncheckedCreateWithoutAgentInput = {
    id?: string
    propertyId: string
    landlordId: string
    tenantId: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    inspections?: InspectionUncheckedCreateNestedManyWithoutTenancyInput
  }

  export type TenancyCreateOrConnectWithoutAgentInput = {
    where: TenancyWhereUniqueInput
    create: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput>
  }

  export type TenancyCreateManyAgentInputEnvelope = {
    data: TenancyCreateManyAgentInput | TenancyCreateManyAgentInput[]
    skipDuplicates?: boolean
  }

  export type InspectionCreateWithoutConductedByInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutConductedByInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutConductedByInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput>
  }

  export type InspectionCreateManyConductedByInputEnvelope = {
    data: InspectionCreateManyConductedByInput | InspectionCreateManyConductedByInput[]
    skipDuplicates?: boolean
  }

  export type SignatureCreateWithoutStakeholderInput = {
    id?: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
    inspection: InspectionCreateNestedOneWithoutSignaturesInput
  }

  export type SignatureUncheckedCreateWithoutStakeholderInput = {
    id?: string
    inspectionId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type SignatureCreateOrConnectWithoutStakeholderInput = {
    where: SignatureWhereUniqueInput
    create: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput>
  }

  export type SignatureCreateManyStakeholderInputEnvelope = {
    data: SignatureCreateManyStakeholderInput | SignatureCreateManyStakeholderInput[]
    skipDuplicates?: boolean
  }

  export type TenancyUpsertWithWhereUniqueWithoutLandlordInput = {
    where: TenancyWhereUniqueInput
    update: XOR<TenancyUpdateWithoutLandlordInput, TenancyUncheckedUpdateWithoutLandlordInput>
    create: XOR<TenancyCreateWithoutLandlordInput, TenancyUncheckedCreateWithoutLandlordInput>
  }

  export type TenancyUpdateWithWhereUniqueWithoutLandlordInput = {
    where: TenancyWhereUniqueInput
    data: XOR<TenancyUpdateWithoutLandlordInput, TenancyUncheckedUpdateWithoutLandlordInput>
  }

  export type TenancyUpdateManyWithWhereWithoutLandlordInput = {
    where: TenancyScalarWhereInput
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyWithoutLandlordInput>
  }

  export type TenancyScalarWhereInput = {
    AND?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
    OR?: TenancyScalarWhereInput[]
    NOT?: TenancyScalarWhereInput | TenancyScalarWhereInput[]
    id?: StringFilter<"Tenancy"> | string
    propertyId?: StringFilter<"Tenancy"> | string
    landlordId?: StringFilter<"Tenancy"> | string
    tenantId?: StringFilter<"Tenancy"> | string
    agentId?: StringNullableFilter<"Tenancy"> | string | null
    startDate?: DateTimeFilter<"Tenancy"> | Date | string
    endDate?: DateTimeFilter<"Tenancy"> | Date | string
    monthlyRent?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFilter<"Tenancy"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFilter<"Tenancy"> | Date | string
    updatedAt?: DateTimeFilter<"Tenancy"> | Date | string
  }

  export type TenancyUpsertWithWhereUniqueWithoutTenantInput = {
    where: TenancyWhereUniqueInput
    update: XOR<TenancyUpdateWithoutTenantInput, TenancyUncheckedUpdateWithoutTenantInput>
    create: XOR<TenancyCreateWithoutTenantInput, TenancyUncheckedCreateWithoutTenantInput>
  }

  export type TenancyUpdateWithWhereUniqueWithoutTenantInput = {
    where: TenancyWhereUniqueInput
    data: XOR<TenancyUpdateWithoutTenantInput, TenancyUncheckedUpdateWithoutTenantInput>
  }

  export type TenancyUpdateManyWithWhereWithoutTenantInput = {
    where: TenancyScalarWhereInput
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyWithoutTenantInput>
  }

  export type TenancyUpsertWithWhereUniqueWithoutAgentInput = {
    where: TenancyWhereUniqueInput
    update: XOR<TenancyUpdateWithoutAgentInput, TenancyUncheckedUpdateWithoutAgentInput>
    create: XOR<TenancyCreateWithoutAgentInput, TenancyUncheckedCreateWithoutAgentInput>
  }

  export type TenancyUpdateWithWhereUniqueWithoutAgentInput = {
    where: TenancyWhereUniqueInput
    data: XOR<TenancyUpdateWithoutAgentInput, TenancyUncheckedUpdateWithoutAgentInput>
  }

  export type TenancyUpdateManyWithWhereWithoutAgentInput = {
    where: TenancyScalarWhereInput
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyWithoutAgentInput>
  }

  export type InspectionUpsertWithWhereUniqueWithoutConductedByInput = {
    where: InspectionWhereUniqueInput
    update: XOR<InspectionUpdateWithoutConductedByInput, InspectionUncheckedUpdateWithoutConductedByInput>
    create: XOR<InspectionCreateWithoutConductedByInput, InspectionUncheckedCreateWithoutConductedByInput>
  }

  export type InspectionUpdateWithWhereUniqueWithoutConductedByInput = {
    where: InspectionWhereUniqueInput
    data: XOR<InspectionUpdateWithoutConductedByInput, InspectionUncheckedUpdateWithoutConductedByInput>
  }

  export type InspectionUpdateManyWithWhereWithoutConductedByInput = {
    where: InspectionScalarWhereInput
    data: XOR<InspectionUpdateManyMutationInput, InspectionUncheckedUpdateManyWithoutConductedByInput>
  }

  export type InspectionScalarWhereInput = {
    AND?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
    OR?: InspectionScalarWhereInput[]
    NOT?: InspectionScalarWhereInput | InspectionScalarWhereInput[]
    id?: StringFilter<"Inspection"> | string
    tenancyId?: StringFilter<"Inspection"> | string
    kind?: EnumInspectionKindFilter<"Inspection"> | $Enums.InspectionKind
    status?: EnumInspectionStatusFilter<"Inspection"> | $Enums.InspectionStatus
    conductedById?: StringNullableFilter<"Inspection"> | string | null
    conductedAt?: DateTimeNullableFilter<"Inspection"> | Date | string | null
    baselineId?: StringNullableFilter<"Inspection"> | string | null
    summary?: StringNullableFilter<"Inspection"> | string | null
    processingError?: StringNullableFilter<"Inspection"> | string | null
    createdAt?: DateTimeFilter<"Inspection"> | Date | string
    updatedAt?: DateTimeFilter<"Inspection"> | Date | string
  }

  export type SignatureUpsertWithWhereUniqueWithoutStakeholderInput = {
    where: SignatureWhereUniqueInput
    update: XOR<SignatureUpdateWithoutStakeholderInput, SignatureUncheckedUpdateWithoutStakeholderInput>
    create: XOR<SignatureCreateWithoutStakeholderInput, SignatureUncheckedCreateWithoutStakeholderInput>
  }

  export type SignatureUpdateWithWhereUniqueWithoutStakeholderInput = {
    where: SignatureWhereUniqueInput
    data: XOR<SignatureUpdateWithoutStakeholderInput, SignatureUncheckedUpdateWithoutStakeholderInput>
  }

  export type SignatureUpdateManyWithWhereWithoutStakeholderInput = {
    where: SignatureScalarWhereInput
    data: XOR<SignatureUpdateManyMutationInput, SignatureUncheckedUpdateManyWithoutStakeholderInput>
  }

  export type SignatureScalarWhereInput = {
    AND?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
    OR?: SignatureScalarWhereInput[]
    NOT?: SignatureScalarWhereInput | SignatureScalarWhereInput[]
    id?: StringFilter<"Signature"> | string
    inspectionId?: StringFilter<"Signature"> | string
    stakeholderId?: StringFilter<"Signature"> | string
    signedAt?: DateTimeFilter<"Signature"> | Date | string
    ipAddress?: StringNullableFilter<"Signature"> | string | null
    imageData?: StringFilter<"Signature"> | string
  }

  export type TenancyCreateWithoutPropertyInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    landlord: StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput
    tenant: StakeholderCreateNestedOneWithoutTenanciesAsTenantInput
    agent?: StakeholderCreateNestedOneWithoutTenanciesAsAgentInput
    inspections?: InspectionCreateNestedManyWithoutTenancyInput
  }

  export type TenancyUncheckedCreateWithoutPropertyInput = {
    id?: string
    landlordId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    inspections?: InspectionUncheckedCreateNestedManyWithoutTenancyInput
  }

  export type TenancyCreateOrConnectWithoutPropertyInput = {
    where: TenancyWhereUniqueInput
    create: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput>
  }

  export type TenancyCreateManyPropertyInputEnvelope = {
    data: TenancyCreateManyPropertyInput | TenancyCreateManyPropertyInput[]
    skipDuplicates?: boolean
  }

  export type TenancyUpsertWithWhereUniqueWithoutPropertyInput = {
    where: TenancyWhereUniqueInput
    update: XOR<TenancyUpdateWithoutPropertyInput, TenancyUncheckedUpdateWithoutPropertyInput>
    create: XOR<TenancyCreateWithoutPropertyInput, TenancyUncheckedCreateWithoutPropertyInput>
  }

  export type TenancyUpdateWithWhereUniqueWithoutPropertyInput = {
    where: TenancyWhereUniqueInput
    data: XOR<TenancyUpdateWithoutPropertyInput, TenancyUncheckedUpdateWithoutPropertyInput>
  }

  export type TenancyUpdateManyWithWhereWithoutPropertyInput = {
    where: TenancyScalarWhereInput
    data: XOR<TenancyUpdateManyMutationInput, TenancyUncheckedUpdateManyWithoutPropertyInput>
  }

  export type PropertyCreateWithoutTenanciesInput = {
    id?: string
    line1: string
    unit?: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PropertyUncheckedCreateWithoutTenanciesInput = {
    id?: string
    line1: string
    unit?: string | null
    postalCode: string
    type: $Enums.PropertyType
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PropertyCreateOrConnectWithoutTenanciesInput = {
    where: PropertyWhereUniqueInput
    create: XOR<PropertyCreateWithoutTenanciesInput, PropertyUncheckedCreateWithoutTenanciesInput>
  }

  export type StakeholderCreateWithoutTenanciesAsLandlordInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsTenant?: TenancyCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionCreateNestedManyWithoutConductedByInput
    signatures?: SignatureCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUncheckedCreateWithoutTenanciesAsLandlordInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsTenant?: TenancyUncheckedCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyUncheckedCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionUncheckedCreateNestedManyWithoutConductedByInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderCreateOrConnectWithoutTenanciesAsLandlordInput = {
    where: StakeholderWhereUniqueInput
    create: XOR<StakeholderCreateWithoutTenanciesAsLandlordInput, StakeholderUncheckedCreateWithoutTenanciesAsLandlordInput>
  }

  export type StakeholderCreateWithoutTenanciesAsTenantInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyCreateNestedManyWithoutLandlordInput
    tenanciesAsAgent?: TenancyCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionCreateNestedManyWithoutConductedByInput
    signatures?: SignatureCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUncheckedCreateWithoutTenanciesAsTenantInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyUncheckedCreateNestedManyWithoutLandlordInput
    tenanciesAsAgent?: TenancyUncheckedCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionUncheckedCreateNestedManyWithoutConductedByInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderCreateOrConnectWithoutTenanciesAsTenantInput = {
    where: StakeholderWhereUniqueInput
    create: XOR<StakeholderCreateWithoutTenanciesAsTenantInput, StakeholderUncheckedCreateWithoutTenanciesAsTenantInput>
  }

  export type StakeholderCreateWithoutTenanciesAsAgentInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyCreateNestedManyWithoutTenantInput
    inspectionsRun?: InspectionCreateNestedManyWithoutConductedByInput
    signatures?: SignatureCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUncheckedCreateWithoutTenanciesAsAgentInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyUncheckedCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyUncheckedCreateNestedManyWithoutTenantInput
    inspectionsRun?: InspectionUncheckedCreateNestedManyWithoutConductedByInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderCreateOrConnectWithoutTenanciesAsAgentInput = {
    where: StakeholderWhereUniqueInput
    create: XOR<StakeholderCreateWithoutTenanciesAsAgentInput, StakeholderUncheckedCreateWithoutTenanciesAsAgentInput>
  }

  export type InspectionCreateWithoutTenancyInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutTenancyInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutTenancyInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput>
  }

  export type InspectionCreateManyTenancyInputEnvelope = {
    data: InspectionCreateManyTenancyInput | InspectionCreateManyTenancyInput[]
    skipDuplicates?: boolean
  }

  export type PropertyUpsertWithoutTenanciesInput = {
    update: XOR<PropertyUpdateWithoutTenanciesInput, PropertyUncheckedUpdateWithoutTenanciesInput>
    create: XOR<PropertyCreateWithoutTenanciesInput, PropertyUncheckedCreateWithoutTenanciesInput>
    where?: PropertyWhereInput
  }

  export type PropertyUpdateToOneWithWhereWithoutTenanciesInput = {
    where?: PropertyWhereInput
    data: XOR<PropertyUpdateWithoutTenanciesInput, PropertyUncheckedUpdateWithoutTenanciesInput>
  }

  export type PropertyUpdateWithoutTenanciesInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PropertyUncheckedUpdateWithoutTenanciesInput = {
    id?: StringFieldUpdateOperationsInput | string
    line1?: StringFieldUpdateOperationsInput | string
    unit?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: StringFieldUpdateOperationsInput | string
    type?: EnumPropertyTypeFieldUpdateOperationsInput | $Enums.PropertyType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StakeholderUpsertWithoutTenanciesAsLandlordInput = {
    update: XOR<StakeholderUpdateWithoutTenanciesAsLandlordInput, StakeholderUncheckedUpdateWithoutTenanciesAsLandlordInput>
    create: XOR<StakeholderCreateWithoutTenanciesAsLandlordInput, StakeholderUncheckedCreateWithoutTenanciesAsLandlordInput>
    where?: StakeholderWhereInput
  }

  export type StakeholderUpdateToOneWithWhereWithoutTenanciesAsLandlordInput = {
    where?: StakeholderWhereInput
    data: XOR<StakeholderUpdateWithoutTenanciesAsLandlordInput, StakeholderUncheckedUpdateWithoutTenanciesAsLandlordInput>
  }

  export type StakeholderUpdateWithoutTenanciesAsLandlordInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsTenant?: TenancyUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUncheckedUpdateWithoutTenanciesAsLandlordInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsTenant?: TenancyUncheckedUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUncheckedUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUncheckedUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUpsertWithoutTenanciesAsTenantInput = {
    update: XOR<StakeholderUpdateWithoutTenanciesAsTenantInput, StakeholderUncheckedUpdateWithoutTenanciesAsTenantInput>
    create: XOR<StakeholderCreateWithoutTenanciesAsTenantInput, StakeholderUncheckedCreateWithoutTenanciesAsTenantInput>
    where?: StakeholderWhereInput
  }

  export type StakeholderUpdateToOneWithWhereWithoutTenanciesAsTenantInput = {
    where?: StakeholderWhereInput
    data: XOR<StakeholderUpdateWithoutTenanciesAsTenantInput, StakeholderUncheckedUpdateWithoutTenanciesAsTenantInput>
  }

  export type StakeholderUpdateWithoutTenanciesAsTenantInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUpdateManyWithoutLandlordNestedInput
    tenanciesAsAgent?: TenancyUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUncheckedUpdateWithoutTenanciesAsTenantInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUncheckedUpdateManyWithoutLandlordNestedInput
    tenanciesAsAgent?: TenancyUncheckedUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUncheckedUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUpsertWithoutTenanciesAsAgentInput = {
    update: XOR<StakeholderUpdateWithoutTenanciesAsAgentInput, StakeholderUncheckedUpdateWithoutTenanciesAsAgentInput>
    create: XOR<StakeholderCreateWithoutTenanciesAsAgentInput, StakeholderUncheckedCreateWithoutTenanciesAsAgentInput>
    where?: StakeholderWhereInput
  }

  export type StakeholderUpdateToOneWithWhereWithoutTenanciesAsAgentInput = {
    where?: StakeholderWhereInput
    data: XOR<StakeholderUpdateWithoutTenanciesAsAgentInput, StakeholderUncheckedUpdateWithoutTenanciesAsAgentInput>
  }

  export type StakeholderUpdateWithoutTenanciesAsAgentInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUpdateManyWithoutTenantNestedInput
    inspectionsRun?: InspectionUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUncheckedUpdateWithoutTenanciesAsAgentInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUncheckedUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUncheckedUpdateManyWithoutTenantNestedInput
    inspectionsRun?: InspectionUncheckedUpdateManyWithoutConductedByNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutStakeholderNestedInput
  }

  export type InspectionUpsertWithWhereUniqueWithoutTenancyInput = {
    where: InspectionWhereUniqueInput
    update: XOR<InspectionUpdateWithoutTenancyInput, InspectionUncheckedUpdateWithoutTenancyInput>
    create: XOR<InspectionCreateWithoutTenancyInput, InspectionUncheckedCreateWithoutTenancyInput>
  }

  export type InspectionUpdateWithWhereUniqueWithoutTenancyInput = {
    where: InspectionWhereUniqueInput
    data: XOR<InspectionUpdateWithoutTenancyInput, InspectionUncheckedUpdateWithoutTenancyInput>
  }

  export type InspectionUpdateManyWithWhereWithoutTenancyInput = {
    where: InspectionScalarWhereInput
    data: XOR<InspectionUpdateManyMutationInput, InspectionUncheckedUpdateManyWithoutTenancyInput>
  }

  export type TenancyCreateWithoutInspectionsInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
    property: PropertyCreateNestedOneWithoutTenanciesInput
    landlord: StakeholderCreateNestedOneWithoutTenanciesAsLandlordInput
    tenant: StakeholderCreateNestedOneWithoutTenanciesAsTenantInput
    agent?: StakeholderCreateNestedOneWithoutTenanciesAsAgentInput
  }

  export type TenancyUncheckedCreateWithoutInspectionsInput = {
    id?: string
    propertyId: string
    landlordId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenancyCreateOrConnectWithoutInspectionsInput = {
    where: TenancyWhereUniqueInput
    create: XOR<TenancyCreateWithoutInspectionsInput, TenancyUncheckedCreateWithoutInspectionsInput>
  }

  export type StakeholderCreateWithoutInspectionsRunInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyCreateNestedManyWithoutAgentInput
    signatures?: SignatureCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderUncheckedCreateWithoutInspectionsRunInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyUncheckedCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyUncheckedCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyUncheckedCreateNestedManyWithoutAgentInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutStakeholderInput
  }

  export type StakeholderCreateOrConnectWithoutInspectionsRunInput = {
    where: StakeholderWhereUniqueInput
    create: XOR<StakeholderCreateWithoutInspectionsRunInput, StakeholderUncheckedCreateWithoutInspectionsRunInput>
  }

  export type InspectionCreateWithoutCheckOutInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutCheckOutInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutCheckOutInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutCheckOutInput, InspectionUncheckedCreateWithoutCheckOutInput>
  }

  export type InspectionCreateWithoutBaselineInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutBaselineInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutBaselineInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
  }

  export type RoomCreateWithoutInspectionInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    captures?: CaptureCreateNestedManyWithoutRoomInput
    items?: InspectionItemCreateNestedManyWithoutRoomInput
  }

  export type RoomUncheckedCreateWithoutInspectionInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    captures?: CaptureUncheckedCreateNestedManyWithoutRoomInput
    items?: InspectionItemUncheckedCreateNestedManyWithoutRoomInput
  }

  export type RoomCreateOrConnectWithoutInspectionInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput>
  }

  export type RoomCreateManyInspectionInputEnvelope = {
    data: RoomCreateManyInspectionInput | RoomCreateManyInspectionInput[]
    skipDuplicates?: boolean
  }

  export type FindingCreateWithoutInspectionInput = {
    id?: string
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    item?: InspectionItemCreateNestedOneWithoutFindingsAsSubjectInput
    baselineItem?: InspectionItemCreateNestedOneWithoutFindingsAsBaselineInput
  }

  export type FindingUncheckedCreateWithoutInspectionInput = {
    id?: string
    itemId?: string | null
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingCreateOrConnectWithoutInspectionInput = {
    where: FindingWhereUniqueInput
    create: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput>
  }

  export type FindingCreateManyInspectionInputEnvelope = {
    data: FindingCreateManyInspectionInput | FindingCreateManyInspectionInput[]
    skipDuplicates?: boolean
  }

  export type SignatureCreateWithoutInspectionInput = {
    id?: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
    stakeholder: StakeholderCreateNestedOneWithoutSignaturesInput
  }

  export type SignatureUncheckedCreateWithoutInspectionInput = {
    id?: string
    stakeholderId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type SignatureCreateOrConnectWithoutInspectionInput = {
    where: SignatureWhereUniqueInput
    create: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput>
  }

  export type SignatureCreateManyInspectionInputEnvelope = {
    data: SignatureCreateManyInspectionInput | SignatureCreateManyInspectionInput[]
    skipDuplicates?: boolean
  }

  export type TenancyUpsertWithoutInspectionsInput = {
    update: XOR<TenancyUpdateWithoutInspectionsInput, TenancyUncheckedUpdateWithoutInspectionsInput>
    create: XOR<TenancyCreateWithoutInspectionsInput, TenancyUncheckedCreateWithoutInspectionsInput>
    where?: TenancyWhereInput
  }

  export type TenancyUpdateToOneWithWhereWithoutInspectionsInput = {
    where?: TenancyWhereInput
    data: XOR<TenancyUpdateWithoutInspectionsInput, TenancyUncheckedUpdateWithoutInspectionsInput>
  }

  export type TenancyUpdateWithoutInspectionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    property?: PropertyUpdateOneRequiredWithoutTenanciesNestedInput
    landlord?: StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput
    tenant?: StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput
    agent?: StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput
  }

  export type TenancyUncheckedUpdateWithoutInspectionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StakeholderUpsertWithoutInspectionsRunInput = {
    update: XOR<StakeholderUpdateWithoutInspectionsRunInput, StakeholderUncheckedUpdateWithoutInspectionsRunInput>
    create: XOR<StakeholderCreateWithoutInspectionsRunInput, StakeholderUncheckedCreateWithoutInspectionsRunInput>
    where?: StakeholderWhereInput
  }

  export type StakeholderUpdateToOneWithWhereWithoutInspectionsRunInput = {
    where?: StakeholderWhereInput
    data: XOR<StakeholderUpdateWithoutInspectionsRunInput, StakeholderUncheckedUpdateWithoutInspectionsRunInput>
  }

  export type StakeholderUpdateWithoutInspectionsRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUpdateManyWithoutAgentNestedInput
    signatures?: SignatureUpdateManyWithoutStakeholderNestedInput
  }

  export type StakeholderUncheckedUpdateWithoutInspectionsRunInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUncheckedUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUncheckedUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUncheckedUpdateManyWithoutAgentNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutStakeholderNestedInput
  }

  export type InspectionUpsertWithoutCheckOutInput = {
    update: XOR<InspectionUpdateWithoutCheckOutInput, InspectionUncheckedUpdateWithoutCheckOutInput>
    create: XOR<InspectionCreateWithoutCheckOutInput, InspectionUncheckedCreateWithoutCheckOutInput>
    where?: InspectionWhereInput
  }

  export type InspectionUpdateToOneWithWhereWithoutCheckOutInput = {
    where?: InspectionWhereInput
    data: XOR<InspectionUpdateWithoutCheckOutInput, InspectionUncheckedUpdateWithoutCheckOutInput>
  }

  export type InspectionUpdateWithoutCheckOutInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutCheckOutInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUpsertWithoutBaselineInput = {
    update: XOR<InspectionUpdateWithoutBaselineInput, InspectionUncheckedUpdateWithoutBaselineInput>
    create: XOR<InspectionCreateWithoutBaselineInput, InspectionUncheckedCreateWithoutBaselineInput>
    where?: InspectionWhereInput
  }

  export type InspectionUpdateToOneWithWhereWithoutBaselineInput = {
    where?: InspectionWhereInput
    data: XOR<InspectionUpdateWithoutBaselineInput, InspectionUncheckedUpdateWithoutBaselineInput>
  }

  export type InspectionUpdateWithoutBaselineInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutBaselineInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type RoomUpsertWithWhereUniqueWithoutInspectionInput = {
    where: RoomWhereUniqueInput
    update: XOR<RoomUpdateWithoutInspectionInput, RoomUncheckedUpdateWithoutInspectionInput>
    create: XOR<RoomCreateWithoutInspectionInput, RoomUncheckedCreateWithoutInspectionInput>
  }

  export type RoomUpdateWithWhereUniqueWithoutInspectionInput = {
    where: RoomWhereUniqueInput
    data: XOR<RoomUpdateWithoutInspectionInput, RoomUncheckedUpdateWithoutInspectionInput>
  }

  export type RoomUpdateManyWithWhereWithoutInspectionInput = {
    where: RoomScalarWhereInput
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyWithoutInspectionInput>
  }

  export type RoomScalarWhereInput = {
    AND?: RoomScalarWhereInput | RoomScalarWhereInput[]
    OR?: RoomScalarWhereInput[]
    NOT?: RoomScalarWhereInput | RoomScalarWhereInput[]
    id?: StringFilter<"Room"> | string
    inspectionId?: StringFilter<"Room"> | string
    name?: StringFilter<"Room"> | string
    order?: IntFilter<"Room"> | number
    status?: EnumRoomStatusFilter<"Room"> | $Enums.RoomStatus
    processingError?: StringNullableFilter<"Room"> | string | null
    createdAt?: DateTimeFilter<"Room"> | Date | string
    updatedAt?: DateTimeFilter<"Room"> | Date | string
  }

  export type FindingUpsertWithWhereUniqueWithoutInspectionInput = {
    where: FindingWhereUniqueInput
    update: XOR<FindingUpdateWithoutInspectionInput, FindingUncheckedUpdateWithoutInspectionInput>
    create: XOR<FindingCreateWithoutInspectionInput, FindingUncheckedCreateWithoutInspectionInput>
  }

  export type FindingUpdateWithWhereUniqueWithoutInspectionInput = {
    where: FindingWhereUniqueInput
    data: XOR<FindingUpdateWithoutInspectionInput, FindingUncheckedUpdateWithoutInspectionInput>
  }

  export type FindingUpdateManyWithWhereWithoutInspectionInput = {
    where: FindingScalarWhereInput
    data: XOR<FindingUpdateManyMutationInput, FindingUncheckedUpdateManyWithoutInspectionInput>
  }

  export type FindingScalarWhereInput = {
    AND?: FindingScalarWhereInput | FindingScalarWhereInput[]
    OR?: FindingScalarWhereInput[]
    NOT?: FindingScalarWhereInput | FindingScalarWhereInput[]
    id?: StringFilter<"Finding"> | string
    inspectionId?: StringFilter<"Finding"> | string
    itemId?: StringNullableFilter<"Finding"> | string | null
    baselineItemId?: StringNullableFilter<"Finding"> | string | null
    changeType?: EnumChangeTypeFilter<"Finding"> | $Enums.ChangeType
    verdict?: EnumVerdictFilter<"Finding"> | $Enums.Verdict
    rationale?: StringFilter<"Finding"> | string
    estimatedCost?: DecimalNullableFilter<"Finding"> | Decimal | DecimalJsLike | number | string | null
    confidence?: FloatNullableFilter<"Finding"> | number | null
    editedByHuman?: BoolFilter<"Finding"> | boolean
    createdAt?: DateTimeFilter<"Finding"> | Date | string
    updatedAt?: DateTimeFilter<"Finding"> | Date | string
  }

  export type SignatureUpsertWithWhereUniqueWithoutInspectionInput = {
    where: SignatureWhereUniqueInput
    update: XOR<SignatureUpdateWithoutInspectionInput, SignatureUncheckedUpdateWithoutInspectionInput>
    create: XOR<SignatureCreateWithoutInspectionInput, SignatureUncheckedCreateWithoutInspectionInput>
  }

  export type SignatureUpdateWithWhereUniqueWithoutInspectionInput = {
    where: SignatureWhereUniqueInput
    data: XOR<SignatureUpdateWithoutInspectionInput, SignatureUncheckedUpdateWithoutInspectionInput>
  }

  export type SignatureUpdateManyWithWhereWithoutInspectionInput = {
    where: SignatureScalarWhereInput
    data: XOR<SignatureUpdateManyMutationInput, SignatureUncheckedUpdateManyWithoutInspectionInput>
  }

  export type RoomCreateWithoutCapturesInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutRoomsInput
    items?: InspectionItemCreateNestedManyWithoutRoomInput
  }

  export type RoomUncheckedCreateWithoutCapturesInput = {
    id?: string
    inspectionId: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: InspectionItemUncheckedCreateNestedManyWithoutRoomInput
  }

  export type RoomCreateOrConnectWithoutCapturesInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutCapturesInput, RoomUncheckedCreateWithoutCapturesInput>
  }

  export type InspectionItemCreateWithoutSourceCaptureInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    room: RoomCreateNestedOneWithoutItemsInput
    findingsAsSubject?: FindingCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemUncheckedCreateWithoutSourceCaptureInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    findingsAsSubject?: FindingUncheckedCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingUncheckedCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemCreateOrConnectWithoutSourceCaptureInput = {
    where: InspectionItemWhereUniqueInput
    create: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput>
  }

  export type InspectionItemCreateManySourceCaptureInputEnvelope = {
    data: InspectionItemCreateManySourceCaptureInput | InspectionItemCreateManySourceCaptureInput[]
    skipDuplicates?: boolean
  }

  export type RoomUpsertWithoutCapturesInput = {
    update: XOR<RoomUpdateWithoutCapturesInput, RoomUncheckedUpdateWithoutCapturesInput>
    create: XOR<RoomCreateWithoutCapturesInput, RoomUncheckedCreateWithoutCapturesInput>
    where?: RoomWhereInput
  }

  export type RoomUpdateToOneWithWhereWithoutCapturesInput = {
    where?: RoomWhereInput
    data: XOR<RoomUpdateWithoutCapturesInput, RoomUncheckedUpdateWithoutCapturesInput>
  }

  export type RoomUpdateWithoutCapturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutRoomsNestedInput
    items?: InspectionItemUpdateManyWithoutRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutCapturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: InspectionItemUncheckedUpdateManyWithoutRoomNestedInput
  }

  export type InspectionItemUpsertWithWhereUniqueWithoutSourceCaptureInput = {
    where: InspectionItemWhereUniqueInput
    update: XOR<InspectionItemUpdateWithoutSourceCaptureInput, InspectionItemUncheckedUpdateWithoutSourceCaptureInput>
    create: XOR<InspectionItemCreateWithoutSourceCaptureInput, InspectionItemUncheckedCreateWithoutSourceCaptureInput>
  }

  export type InspectionItemUpdateWithWhereUniqueWithoutSourceCaptureInput = {
    where: InspectionItemWhereUniqueInput
    data: XOR<InspectionItemUpdateWithoutSourceCaptureInput, InspectionItemUncheckedUpdateWithoutSourceCaptureInput>
  }

  export type InspectionItemUpdateManyWithWhereWithoutSourceCaptureInput = {
    where: InspectionItemScalarWhereInput
    data: XOR<InspectionItemUpdateManyMutationInput, InspectionItemUncheckedUpdateManyWithoutSourceCaptureInput>
  }

  export type InspectionItemScalarWhereInput = {
    AND?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
    OR?: InspectionItemScalarWhereInput[]
    NOT?: InspectionItemScalarWhereInput | InspectionItemScalarWhereInput[]
    id?: StringFilter<"InspectionItem"> | string
    roomId?: StringFilter<"InspectionItem"> | string
    name?: StringFilter<"InspectionItem"> | string
    category?: EnumItemCategoryFilter<"InspectionItem"> | $Enums.ItemCategory
    condition?: EnumItemConditionFilter<"InspectionItem"> | $Enums.ItemCondition
    quantity?: IntFilter<"InspectionItem"> | number
    notes?: StringNullableFilter<"InspectionItem"> | string | null
    identifier?: StringNullableFilter<"InspectionItem"> | string | null
    meterReading?: StringNullableFilter<"InspectionItem"> | string | null
    sourceCaptureId?: StringNullableFilter<"InspectionItem"> | string | null
    sourceTimestampSec?: IntNullableFilter<"InspectionItem"> | number | null
    confidence?: FloatNullableFilter<"InspectionItem"> | number | null
    editedByHuman?: BoolFilter<"InspectionItem"> | boolean
    createdAt?: DateTimeFilter<"InspectionItem"> | Date | string
    updatedAt?: DateTimeFilter<"InspectionItem"> | Date | string
  }

  export type InspectionCreateWithoutRoomsInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutRoomsInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutRoomsInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutRoomsInput, InspectionUncheckedCreateWithoutRoomsInput>
  }

  export type CaptureCreateWithoutRoomInput = {
    id?: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    items?: InspectionItemCreateNestedManyWithoutSourceCaptureInput
  }

  export type CaptureUncheckedCreateWithoutRoomInput = {
    id?: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    items?: InspectionItemUncheckedCreateNestedManyWithoutSourceCaptureInput
  }

  export type CaptureCreateOrConnectWithoutRoomInput = {
    where: CaptureWhereUniqueInput
    create: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput>
  }

  export type CaptureCreateManyRoomInputEnvelope = {
    data: CaptureCreateManyRoomInput | CaptureCreateManyRoomInput[]
    skipDuplicates?: boolean
  }

  export type InspectionItemCreateWithoutRoomInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    sourceCapture?: CaptureCreateNestedOneWithoutItemsInput
    findingsAsSubject?: FindingCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemUncheckedCreateWithoutRoomInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    findingsAsSubject?: FindingUncheckedCreateNestedManyWithoutItemInput
    findingsAsBaseline?: FindingUncheckedCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemCreateOrConnectWithoutRoomInput = {
    where: InspectionItemWhereUniqueInput
    create: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput>
  }

  export type InspectionItemCreateManyRoomInputEnvelope = {
    data: InspectionItemCreateManyRoomInput | InspectionItemCreateManyRoomInput[]
    skipDuplicates?: boolean
  }

  export type InspectionUpsertWithoutRoomsInput = {
    update: XOR<InspectionUpdateWithoutRoomsInput, InspectionUncheckedUpdateWithoutRoomsInput>
    create: XOR<InspectionCreateWithoutRoomsInput, InspectionUncheckedCreateWithoutRoomsInput>
    where?: InspectionWhereInput
  }

  export type InspectionUpdateToOneWithWhereWithoutRoomsInput = {
    where?: InspectionWhereInput
    data: XOR<InspectionUpdateWithoutRoomsInput, InspectionUncheckedUpdateWithoutRoomsInput>
  }

  export type InspectionUpdateWithoutRoomsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutRoomsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type CaptureUpsertWithWhereUniqueWithoutRoomInput = {
    where: CaptureWhereUniqueInput
    update: XOR<CaptureUpdateWithoutRoomInput, CaptureUncheckedUpdateWithoutRoomInput>
    create: XOR<CaptureCreateWithoutRoomInput, CaptureUncheckedCreateWithoutRoomInput>
  }

  export type CaptureUpdateWithWhereUniqueWithoutRoomInput = {
    where: CaptureWhereUniqueInput
    data: XOR<CaptureUpdateWithoutRoomInput, CaptureUncheckedUpdateWithoutRoomInput>
  }

  export type CaptureUpdateManyWithWhereWithoutRoomInput = {
    where: CaptureScalarWhereInput
    data: XOR<CaptureUpdateManyMutationInput, CaptureUncheckedUpdateManyWithoutRoomInput>
  }

  export type CaptureScalarWhereInput = {
    AND?: CaptureScalarWhereInput | CaptureScalarWhereInput[]
    OR?: CaptureScalarWhereInput[]
    NOT?: CaptureScalarWhereInput | CaptureScalarWhereInput[]
    id?: StringFilter<"Capture"> | string
    roomId?: StringFilter<"Capture"> | string
    kind?: EnumCaptureKindFilter<"Capture"> | $Enums.CaptureKind
    storagePath?: StringFilter<"Capture"> | string
    mimeType?: StringFilter<"Capture"> | string
    sizeBytes?: IntFilter<"Capture"> | number
    durationSec?: IntNullableFilter<"Capture"> | number | null
    transcript?: StringNullableFilter<"Capture"> | string | null
    note?: StringNullableFilter<"Capture"> | string | null
    processedAt?: DateTimeNullableFilter<"Capture"> | Date | string | null
    createdAt?: DateTimeFilter<"Capture"> | Date | string
  }

  export type InspectionItemUpsertWithWhereUniqueWithoutRoomInput = {
    where: InspectionItemWhereUniqueInput
    update: XOR<InspectionItemUpdateWithoutRoomInput, InspectionItemUncheckedUpdateWithoutRoomInput>
    create: XOR<InspectionItemCreateWithoutRoomInput, InspectionItemUncheckedCreateWithoutRoomInput>
  }

  export type InspectionItemUpdateWithWhereUniqueWithoutRoomInput = {
    where: InspectionItemWhereUniqueInput
    data: XOR<InspectionItemUpdateWithoutRoomInput, InspectionItemUncheckedUpdateWithoutRoomInput>
  }

  export type InspectionItemUpdateManyWithWhereWithoutRoomInput = {
    where: InspectionItemScalarWhereInput
    data: XOR<InspectionItemUpdateManyMutationInput, InspectionItemUncheckedUpdateManyWithoutRoomInput>
  }

  export type RoomCreateWithoutItemsInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutRoomsInput
    captures?: CaptureCreateNestedManyWithoutRoomInput
  }

  export type RoomUncheckedCreateWithoutItemsInput = {
    id?: string
    inspectionId: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    captures?: CaptureUncheckedCreateNestedManyWithoutRoomInput
  }

  export type RoomCreateOrConnectWithoutItemsInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutItemsInput, RoomUncheckedCreateWithoutItemsInput>
  }

  export type CaptureCreateWithoutItemsInput = {
    id?: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    room: RoomCreateNestedOneWithoutCapturesInput
  }

  export type CaptureUncheckedCreateWithoutItemsInput = {
    id?: string
    roomId: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type CaptureCreateOrConnectWithoutItemsInput = {
    where: CaptureWhereUniqueInput
    create: XOR<CaptureCreateWithoutItemsInput, CaptureUncheckedCreateWithoutItemsInput>
  }

  export type FindingCreateWithoutItemInput = {
    id?: string
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutFindingsInput
    baselineItem?: InspectionItemCreateNestedOneWithoutFindingsAsBaselineInput
  }

  export type FindingUncheckedCreateWithoutItemInput = {
    id?: string
    inspectionId: string
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingCreateOrConnectWithoutItemInput = {
    where: FindingWhereUniqueInput
    create: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput>
  }

  export type FindingCreateManyItemInputEnvelope = {
    data: FindingCreateManyItemInput | FindingCreateManyItemInput[]
    skipDuplicates?: boolean
  }

  export type FindingCreateWithoutBaselineItemInput = {
    id?: string
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    inspection: InspectionCreateNestedOneWithoutFindingsInput
    item?: InspectionItemCreateNestedOneWithoutFindingsAsSubjectInput
  }

  export type FindingUncheckedCreateWithoutBaselineItemInput = {
    id?: string
    inspectionId: string
    itemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingCreateOrConnectWithoutBaselineItemInput = {
    where: FindingWhereUniqueInput
    create: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput>
  }

  export type FindingCreateManyBaselineItemInputEnvelope = {
    data: FindingCreateManyBaselineItemInput | FindingCreateManyBaselineItemInput[]
    skipDuplicates?: boolean
  }

  export type RoomUpsertWithoutItemsInput = {
    update: XOR<RoomUpdateWithoutItemsInput, RoomUncheckedUpdateWithoutItemsInput>
    create: XOR<RoomCreateWithoutItemsInput, RoomUncheckedCreateWithoutItemsInput>
    where?: RoomWhereInput
  }

  export type RoomUpdateToOneWithWhereWithoutItemsInput = {
    where?: RoomWhereInput
    data: XOR<RoomUpdateWithoutItemsInput, RoomUncheckedUpdateWithoutItemsInput>
  }

  export type RoomUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutRoomsNestedInput
    captures?: CaptureUpdateManyWithoutRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    captures?: CaptureUncheckedUpdateManyWithoutRoomNestedInput
  }

  export type CaptureUpsertWithoutItemsInput = {
    update: XOR<CaptureUpdateWithoutItemsInput, CaptureUncheckedUpdateWithoutItemsInput>
    create: XOR<CaptureCreateWithoutItemsInput, CaptureUncheckedCreateWithoutItemsInput>
    where?: CaptureWhereInput
  }

  export type CaptureUpdateToOneWithWhereWithoutItemsInput = {
    where?: CaptureWhereInput
    data: XOR<CaptureUpdateWithoutItemsInput, CaptureUncheckedUpdateWithoutItemsInput>
  }

  export type CaptureUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutCapturesNestedInput
  }

  export type CaptureUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUpsertWithWhereUniqueWithoutItemInput = {
    where: FindingWhereUniqueInput
    update: XOR<FindingUpdateWithoutItemInput, FindingUncheckedUpdateWithoutItemInput>
    create: XOR<FindingCreateWithoutItemInput, FindingUncheckedCreateWithoutItemInput>
  }

  export type FindingUpdateWithWhereUniqueWithoutItemInput = {
    where: FindingWhereUniqueInput
    data: XOR<FindingUpdateWithoutItemInput, FindingUncheckedUpdateWithoutItemInput>
  }

  export type FindingUpdateManyWithWhereWithoutItemInput = {
    where: FindingScalarWhereInput
    data: XOR<FindingUpdateManyMutationInput, FindingUncheckedUpdateManyWithoutItemInput>
  }

  export type FindingUpsertWithWhereUniqueWithoutBaselineItemInput = {
    where: FindingWhereUniqueInput
    update: XOR<FindingUpdateWithoutBaselineItemInput, FindingUncheckedUpdateWithoutBaselineItemInput>
    create: XOR<FindingCreateWithoutBaselineItemInput, FindingUncheckedCreateWithoutBaselineItemInput>
  }

  export type FindingUpdateWithWhereUniqueWithoutBaselineItemInput = {
    where: FindingWhereUniqueInput
    data: XOR<FindingUpdateWithoutBaselineItemInput, FindingUncheckedUpdateWithoutBaselineItemInput>
  }

  export type FindingUpdateManyWithWhereWithoutBaselineItemInput = {
    where: FindingScalarWhereInput
    data: XOR<FindingUpdateManyMutationInput, FindingUncheckedUpdateManyWithoutBaselineItemInput>
  }

  export type InspectionCreateWithoutFindingsInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    signatures?: SignatureCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutFindingsInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    signatures?: SignatureUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutFindingsInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutFindingsInput, InspectionUncheckedCreateWithoutFindingsInput>
  }

  export type InspectionItemCreateWithoutFindingsAsSubjectInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    room: RoomCreateNestedOneWithoutItemsInput
    sourceCapture?: CaptureCreateNestedOneWithoutItemsInput
    findingsAsBaseline?: FindingCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemUncheckedCreateWithoutFindingsAsSubjectInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    findingsAsBaseline?: FindingUncheckedCreateNestedManyWithoutBaselineItemInput
  }

  export type InspectionItemCreateOrConnectWithoutFindingsAsSubjectInput = {
    where: InspectionItemWhereUniqueInput
    create: XOR<InspectionItemCreateWithoutFindingsAsSubjectInput, InspectionItemUncheckedCreateWithoutFindingsAsSubjectInput>
  }

  export type InspectionItemCreateWithoutFindingsAsBaselineInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    room: RoomCreateNestedOneWithoutItemsInput
    sourceCapture?: CaptureCreateNestedOneWithoutItemsInput
    findingsAsSubject?: FindingCreateNestedManyWithoutItemInput
  }

  export type InspectionItemUncheckedCreateWithoutFindingsAsBaselineInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    findingsAsSubject?: FindingUncheckedCreateNestedManyWithoutItemInput
  }

  export type InspectionItemCreateOrConnectWithoutFindingsAsBaselineInput = {
    where: InspectionItemWhereUniqueInput
    create: XOR<InspectionItemCreateWithoutFindingsAsBaselineInput, InspectionItemUncheckedCreateWithoutFindingsAsBaselineInput>
  }

  export type InspectionUpsertWithoutFindingsInput = {
    update: XOR<InspectionUpdateWithoutFindingsInput, InspectionUncheckedUpdateWithoutFindingsInput>
    create: XOR<InspectionCreateWithoutFindingsInput, InspectionUncheckedCreateWithoutFindingsInput>
    where?: InspectionWhereInput
  }

  export type InspectionUpdateToOneWithWhereWithoutFindingsInput = {
    where?: InspectionWhereInput
    data: XOR<InspectionUpdateWithoutFindingsInput, InspectionUncheckedUpdateWithoutFindingsInput>
  }

  export type InspectionUpdateWithoutFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutFindingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionItemUpsertWithoutFindingsAsSubjectInput = {
    update: XOR<InspectionItemUpdateWithoutFindingsAsSubjectInput, InspectionItemUncheckedUpdateWithoutFindingsAsSubjectInput>
    create: XOR<InspectionItemCreateWithoutFindingsAsSubjectInput, InspectionItemUncheckedCreateWithoutFindingsAsSubjectInput>
    where?: InspectionItemWhereInput
  }

  export type InspectionItemUpdateToOneWithWhereWithoutFindingsAsSubjectInput = {
    where?: InspectionItemWhereInput
    data: XOR<InspectionItemUpdateWithoutFindingsAsSubjectInput, InspectionItemUncheckedUpdateWithoutFindingsAsSubjectInput>
  }

  export type InspectionItemUpdateWithoutFindingsAsSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutItemsNestedInput
    sourceCapture?: CaptureUpdateOneWithoutItemsNestedInput
    findingsAsBaseline?: FindingUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateWithoutFindingsAsSubjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    findingsAsBaseline?: FindingUncheckedUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUpsertWithoutFindingsAsBaselineInput = {
    update: XOR<InspectionItemUpdateWithoutFindingsAsBaselineInput, InspectionItemUncheckedUpdateWithoutFindingsAsBaselineInput>
    create: XOR<InspectionItemCreateWithoutFindingsAsBaselineInput, InspectionItemUncheckedCreateWithoutFindingsAsBaselineInput>
    where?: InspectionItemWhereInput
  }

  export type InspectionItemUpdateToOneWithWhereWithoutFindingsAsBaselineInput = {
    where?: InspectionItemWhereInput
    data: XOR<InspectionItemUpdateWithoutFindingsAsBaselineInput, InspectionItemUncheckedUpdateWithoutFindingsAsBaselineInput>
  }

  export type InspectionItemUpdateWithoutFindingsAsBaselineInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutItemsNestedInput
    sourceCapture?: CaptureUpdateOneWithoutItemsNestedInput
    findingsAsSubject?: FindingUpdateManyWithoutItemNestedInput
  }

  export type InspectionItemUncheckedUpdateWithoutFindingsAsBaselineInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    findingsAsSubject?: FindingUncheckedUpdateManyWithoutItemNestedInput
  }

  export type InspectionCreateWithoutSignaturesInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenancy: TenancyCreateNestedOneWithoutInspectionsInput
    conductedBy?: StakeholderCreateNestedOneWithoutInspectionsRunInput
    baseline?: InspectionCreateNestedOneWithoutCheckOutInput
    checkOut?: InspectionCreateNestedOneWithoutBaselineInput
    rooms?: RoomCreateNestedManyWithoutInspectionInput
    findings?: FindingCreateNestedManyWithoutInspectionInput
  }

  export type InspectionUncheckedCreateWithoutSignaturesInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    checkOut?: InspectionUncheckedCreateNestedOneWithoutBaselineInput
    rooms?: RoomUncheckedCreateNestedManyWithoutInspectionInput
    findings?: FindingUncheckedCreateNestedManyWithoutInspectionInput
  }

  export type InspectionCreateOrConnectWithoutSignaturesInput = {
    where: InspectionWhereUniqueInput
    create: XOR<InspectionCreateWithoutSignaturesInput, InspectionUncheckedCreateWithoutSignaturesInput>
  }

  export type StakeholderCreateWithoutSignaturesInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionCreateNestedManyWithoutConductedByInput
  }

  export type StakeholderUncheckedCreateWithoutSignaturesInput = {
    id?: string
    kind?: $Enums.StakeholderKind
    name: string
    idNumber?: string | null
    email?: string | null
    phone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenanciesAsLandlord?: TenancyUncheckedCreateNestedManyWithoutLandlordInput
    tenanciesAsTenant?: TenancyUncheckedCreateNestedManyWithoutTenantInput
    tenanciesAsAgent?: TenancyUncheckedCreateNestedManyWithoutAgentInput
    inspectionsRun?: InspectionUncheckedCreateNestedManyWithoutConductedByInput
  }

  export type StakeholderCreateOrConnectWithoutSignaturesInput = {
    where: StakeholderWhereUniqueInput
    create: XOR<StakeholderCreateWithoutSignaturesInput, StakeholderUncheckedCreateWithoutSignaturesInput>
  }

  export type InspectionUpsertWithoutSignaturesInput = {
    update: XOR<InspectionUpdateWithoutSignaturesInput, InspectionUncheckedUpdateWithoutSignaturesInput>
    create: XOR<InspectionCreateWithoutSignaturesInput, InspectionUncheckedCreateWithoutSignaturesInput>
    where?: InspectionWhereInput
  }

  export type InspectionUpdateToOneWithWhereWithoutSignaturesInput = {
    where?: InspectionWhereInput
    data: XOR<InspectionUpdateWithoutSignaturesInput, InspectionUncheckedUpdateWithoutSignaturesInput>
  }

  export type InspectionUpdateWithoutSignaturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutSignaturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type StakeholderUpsertWithoutSignaturesInput = {
    update: XOR<StakeholderUpdateWithoutSignaturesInput, StakeholderUncheckedUpdateWithoutSignaturesInput>
    create: XOR<StakeholderCreateWithoutSignaturesInput, StakeholderUncheckedCreateWithoutSignaturesInput>
    where?: StakeholderWhereInput
  }

  export type StakeholderUpdateToOneWithWhereWithoutSignaturesInput = {
    where?: StakeholderWhereInput
    data: XOR<StakeholderUpdateWithoutSignaturesInput, StakeholderUncheckedUpdateWithoutSignaturesInput>
  }

  export type StakeholderUpdateWithoutSignaturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUpdateManyWithoutConductedByNestedInput
  }

  export type StakeholderUncheckedUpdateWithoutSignaturesInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumStakeholderKindFieldUpdateOperationsInput | $Enums.StakeholderKind
    name?: StringFieldUpdateOperationsInput | string
    idNumber?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenanciesAsLandlord?: TenancyUncheckedUpdateManyWithoutLandlordNestedInput
    tenanciesAsTenant?: TenancyUncheckedUpdateManyWithoutTenantNestedInput
    tenanciesAsAgent?: TenancyUncheckedUpdateManyWithoutAgentNestedInput
    inspectionsRun?: InspectionUncheckedUpdateManyWithoutConductedByNestedInput
  }

  export type TenancyCreateManyLandlordInput = {
    id?: string
    propertyId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenancyCreateManyTenantInput = {
    id?: string
    propertyId: string
    landlordId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenancyCreateManyAgentInput = {
    id?: string
    propertyId: string
    landlordId: string
    tenantId: string
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InspectionCreateManyConductedByInput = {
    id?: string
    tenancyId: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SignatureCreateManyStakeholderInput = {
    id?: string
    inspectionId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type TenancyUpdateWithoutLandlordInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    property?: PropertyUpdateOneRequiredWithoutTenanciesNestedInput
    tenant?: StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput
    agent?: StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput
    inspections?: InspectionUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateWithoutLandlordInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspections?: InspectionUncheckedUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateManyWithoutLandlordInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenancyUpdateWithoutTenantInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    property?: PropertyUpdateOneRequiredWithoutTenanciesNestedInput
    landlord?: StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput
    agent?: StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput
    inspections?: InspectionUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateWithoutTenantInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspections?: InspectionUncheckedUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateManyWithoutTenantInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenancyUpdateWithoutAgentInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    property?: PropertyUpdateOneRequiredWithoutTenanciesNestedInput
    landlord?: StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput
    tenant?: StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput
    inspections?: InspectionUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateWithoutAgentInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspections?: InspectionUncheckedUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateManyWithoutAgentInput = {
    id?: StringFieldUpdateOperationsInput | string
    propertyId?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionUpdateWithoutConductedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenancy?: TenancyUpdateOneRequiredWithoutInspectionsNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutConductedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateManyWithoutConductedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenancyId?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SignatureUpdateWithoutStakeholderInput = {
    id?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
    inspection?: InspectionUpdateOneRequiredWithoutSignaturesNestedInput
  }

  export type SignatureUncheckedUpdateWithoutStakeholderInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type SignatureUncheckedUpdateManyWithoutStakeholderInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type TenancyCreateManyPropertyInput = {
    id?: string
    landlordId: string
    tenantId: string
    agentId?: string | null
    startDate: Date | string
    endDate: Date | string
    monthlyRent: Decimal | DecimalJsLike | number | string
    deposit: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenancyUpdateWithoutPropertyInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    landlord?: StakeholderUpdateOneRequiredWithoutTenanciesAsLandlordNestedInput
    tenant?: StakeholderUpdateOneRequiredWithoutTenanciesAsTenantNestedInput
    agent?: StakeholderUpdateOneWithoutTenanciesAsAgentNestedInput
    inspections?: InspectionUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateWithoutPropertyInput = {
    id?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspections?: InspectionUncheckedUpdateManyWithoutTenancyNestedInput
  }

  export type TenancyUncheckedUpdateManyWithoutPropertyInput = {
    id?: StringFieldUpdateOperationsInput | string
    landlordId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    agentId?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    monthlyRent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    deposit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionCreateManyTenancyInput = {
    id?: string
    kind: $Enums.InspectionKind
    status?: $Enums.InspectionStatus
    conductedById?: string | null
    conductedAt?: Date | string | null
    baselineId?: string | null
    summary?: string | null
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InspectionUpdateWithoutTenancyInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    conductedBy?: StakeholderUpdateOneWithoutInspectionsRunNestedInput
    baseline?: InspectionUpdateOneWithoutCheckOutNestedInput
    checkOut?: InspectionUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUpdateManyWithoutInspectionNestedInput
    findings?: FindingUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateWithoutTenancyInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOut?: InspectionUncheckedUpdateOneWithoutBaselineNestedInput
    rooms?: RoomUncheckedUpdateManyWithoutInspectionNestedInput
    findings?: FindingUncheckedUpdateManyWithoutInspectionNestedInput
    signatures?: SignatureUncheckedUpdateManyWithoutInspectionNestedInput
  }

  export type InspectionUncheckedUpdateManyWithoutTenancyInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumInspectionKindFieldUpdateOperationsInput | $Enums.InspectionKind
    status?: EnumInspectionStatusFieldUpdateOperationsInput | $Enums.InspectionStatus
    conductedById?: NullableStringFieldUpdateOperationsInput | string | null
    conductedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    baselineId?: NullableStringFieldUpdateOperationsInput | string | null
    summary?: NullableStringFieldUpdateOperationsInput | string | null
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomCreateManyInspectionInput = {
    id?: string
    name: string
    order: number
    status?: $Enums.RoomStatus
    processingError?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingCreateManyInspectionInput = {
    id?: string
    itemId?: string | null
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SignatureCreateManyInspectionInput = {
    id?: string
    stakeholderId: string
    signedAt?: Date | string
    ipAddress?: string | null
    imageData: string
  }

  export type RoomUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    captures?: CaptureUpdateManyWithoutRoomNestedInput
    items?: InspectionItemUpdateManyWithoutRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    captures?: CaptureUncheckedUpdateManyWithoutRoomNestedInput
    items?: InspectionItemUncheckedUpdateManyWithoutRoomNestedInput
  }

  export type RoomUncheckedUpdateManyWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    status?: EnumRoomStatusFieldUpdateOperationsInput | $Enums.RoomStatus
    processingError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    item?: InspectionItemUpdateOneWithoutFindingsAsSubjectNestedInput
    baselineItem?: InspectionItemUpdateOneWithoutFindingsAsBaselineNestedInput
  }

  export type FindingUncheckedUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUncheckedUpdateManyWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SignatureUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
    stakeholder?: StakeholderUpdateOneRequiredWithoutSignaturesNestedInput
  }

  export type SignatureUncheckedUpdateWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    stakeholderId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type SignatureUncheckedUpdateManyWithoutInspectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    stakeholderId?: StringFieldUpdateOperationsInput | string
    signedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    imageData?: StringFieldUpdateOperationsInput | string
  }

  export type InspectionItemCreateManySourceCaptureInput = {
    id?: string
    roomId: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InspectionItemUpdateWithoutSourceCaptureInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    room?: RoomUpdateOneRequiredWithoutItemsNestedInput
    findingsAsSubject?: FindingUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateWithoutSourceCaptureInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    findingsAsSubject?: FindingUncheckedUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUncheckedUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateManyWithoutSourceCaptureInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CaptureCreateManyRoomInput = {
    id?: string
    kind?: $Enums.CaptureKind
    storagePath: string
    mimeType: string
    sizeBytes: number
    durationSec?: number | null
    transcript?: string | null
    note?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type InspectionItemCreateManyRoomInput = {
    id?: string
    name: string
    category: $Enums.ItemCategory
    condition: $Enums.ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
    sourceCaptureId?: string | null
    sourceTimestampSec?: number | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CaptureUpdateWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: InspectionItemUpdateManyWithoutSourceCaptureNestedInput
  }

  export type CaptureUncheckedUpdateWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: InspectionItemUncheckedUpdateManyWithoutSourceCaptureNestedInput
  }

  export type CaptureUncheckedUpdateManyWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumCaptureKindFieldUpdateOperationsInput | $Enums.CaptureKind
    storagePath?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    durationSec?: NullableIntFieldUpdateOperationsInput | number | null
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InspectionItemUpdateWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sourceCapture?: CaptureUpdateOneWithoutItemsNestedInput
    findingsAsSubject?: FindingUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    findingsAsSubject?: FindingUncheckedUpdateManyWithoutItemNestedInput
    findingsAsBaseline?: FindingUncheckedUpdateManyWithoutBaselineItemNestedInput
  }

  export type InspectionItemUncheckedUpdateManyWithoutRoomInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    category?: EnumItemCategoryFieldUpdateOperationsInput | $Enums.ItemCategory
    condition?: EnumItemConditionFieldUpdateOperationsInput | $Enums.ItemCondition
    quantity?: IntFieldUpdateOperationsInput | number
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    identifier?: NullableStringFieldUpdateOperationsInput | string | null
    meterReading?: NullableStringFieldUpdateOperationsInput | string | null
    sourceCaptureId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceTimestampSec?: NullableIntFieldUpdateOperationsInput | number | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingCreateManyItemInput = {
    id?: string
    inspectionId: string
    baselineItemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingCreateManyBaselineItemInput = {
    id?: string
    inspectionId: string
    itemId?: string | null
    changeType: $Enums.ChangeType
    verdict?: $Enums.Verdict
    rationale: string
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    confidence?: number | null
    editedByHuman?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FindingUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutFindingsNestedInput
    baselineItem?: InspectionItemUpdateOneWithoutFindingsAsBaselineNestedInput
  }

  export type FindingUncheckedUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUncheckedUpdateManyWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    baselineItemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUpdateWithoutBaselineItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    inspection?: InspectionUpdateOneRequiredWithoutFindingsNestedInput
    item?: InspectionItemUpdateOneWithoutFindingsAsSubjectNestedInput
  }

  export type FindingUncheckedUpdateWithoutBaselineItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FindingUncheckedUpdateManyWithoutBaselineItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    inspectionId?: StringFieldUpdateOperationsInput | string
    itemId?: NullableStringFieldUpdateOperationsInput | string | null
    changeType?: EnumChangeTypeFieldUpdateOperationsInput | $Enums.ChangeType
    verdict?: EnumVerdictFieldUpdateOperationsInput | $Enums.Verdict
    rationale?: StringFieldUpdateOperationsInput | string
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    editedByHuman?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}