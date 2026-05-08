import {
  DateResolver,
  DateTimeResolver,
} from "graphql-scalars";
import { builder } from "./builder.ts";

builder.addScalarType("DateTime", DateTimeResolver);
builder.addScalarType("Date", DateResolver);
