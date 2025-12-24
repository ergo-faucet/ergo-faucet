export interface FilterOptions {
  // asset filter
  asset_any?: string[];
  asset_all?: string[];

  // auth filter
  auth_any?: number[];
  auth_all?: number[];

  // time filter
  open_before?: number;
  open_after?: number;
  close_before?: number;
  close_after?: number;

  // search by pattern
  pattern?: string;

  // search by id
  id?: number;
}
