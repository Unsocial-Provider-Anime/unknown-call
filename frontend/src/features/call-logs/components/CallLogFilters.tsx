import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { CallLogSearch } from "../api";
import { hasCallLogFilters } from "../model";

interface CallLogFiltersProps {
  filters: CallLogSearch;
  countryCodes: string[];
  onChange: (filters: CallLogSearch) => void;
  onClear: () => void;
}

export function CallLogFilters({
  filters,
  countryCodes,
  onChange,
  onClear,
}: CallLogFiltersProps) {
  const { control, register, reset } = useForm<CallLogSearch>({
    defaultValues: filters,
  });
  const filterValues = useWatch({ control });
  const search = filters.search;
  const countryCode = filters.countryCode;
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  useEffect(() => {
    reset({ search, countryCode, dateFrom, dateTo });
  }, [countryCode, dateFrom, dateTo, reset, search]);

  const currentFilters = {
    search: filterValues.search ?? search,
    countryCode: filterValues.countryCode ?? countryCode,
    dateFrom: filterValues.dateFrom ?? dateFrom,
    dateTo: filterValues.dateTo ?? dateTo,
  };

  return (
    <Box
      component="form"
      aria-label="Call log filters"
      onSubmit={(event) => {
        event.preventDefault();
      }}
      sx={{
        py: 2,
        borderTop: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 1.5,
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <TextField
          label="Search calls"
          placeholder="Number, country code, date..."
          {...register("search", {
            onChange: (event) => {
              onChange({ ...currentFilters, search: event.currentTarget.value });
            },
          })}
          size="small"
          sx={{ flex: 1, minWidth: { md: 220 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 165 } }}>
          <InputLabel id="country-filter-label">Country code</InputLabel>
          <Controller
            name="countryCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="country-filter-label"
                label="Country code"
                onChange={(event) => {
                  field.onChange(event);
                  onChange({
                    ...currentFilters,
                    countryCode: String(event.target.value),
                  });
                }}
              >
                <MenuItem value="all">All country codes</MenuItem>
                {countryCodes.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
        <Controller
          name="dateFrom"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From"
              value={field.value ? dayjs(field.value) : null}
              onChange={(value) => {
                const dateFromValue = value?.isValid()
                  ? value.format("YYYY-MM-DD")
                  : "";
                field.onChange(dateFromValue);
                onChange({ ...currentFilters, dateFrom: dateFromValue });
              }}
              slotProps={{ textField: { size: "small" } }}
              sx={{ minWidth: { xs: "100%", md: 155 } }}
            />
          )}
        />
        <Controller
          name="dateTo"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To"
              value={field.value ? dayjs(field.value) : null}
              onChange={(value) => {
                const dateToValue = value?.isValid()
                  ? value.format("YYYY-MM-DD")
                  : "";
                field.onChange(dateToValue);
                onChange({ ...currentFilters, dateTo: dateToValue });
              }}
              slotProps={{ textField: { size: "small" } }}
              sx={{ minWidth: { xs: "100%", md: 155 } }}
            />
          )}
        />
        <Button
          variant="text"
          color="inherit"
          disabled={!hasCallLogFilters(currentFilters)}
          onClick={() => {
            onClear();
          }}
          sx={{
            alignSelf: { xs: "flex-start", md: "center" },
            whiteSpace: "nowrap",
          }}
        >
          Clear filters
        </Button>
      </Box>
    </Box>
  );
}