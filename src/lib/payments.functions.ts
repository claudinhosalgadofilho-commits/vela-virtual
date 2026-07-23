import { createServerFn } from "@tanstack/react-start";
import { createOrderInput, orderStatusInput, uploadPhotoInput } from "./payments.schemas";
import {
  createOrderPayment,
  fetchOrderDetails,
  fetchOrderStatus,
  storeTributePhoto,
} from "./payments.server";

export const uploadTributePhoto = createServerFn({ method: "POST" })
  .inputValidator((raw) => uploadPhotoInput.parse(raw))
  .handler(async ({ data }) => storeTributePhoto(data));

export const createOrderAndPayment = createServerFn({ method: "POST" })
  .inputValidator((raw) => createOrderInput.parse(raw))
  .handler(async ({ data }) => createOrderPayment(data));

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((raw) => orderStatusInput.parse(raw))
  .handler(async ({ data }) => fetchOrderStatus(data));

export const getOrderDetails = createServerFn({ method: "GET" })
  .inputValidator((raw) => orderStatusInput.parse(raw))
  .handler(async ({ data }) => fetchOrderDetails(data));
