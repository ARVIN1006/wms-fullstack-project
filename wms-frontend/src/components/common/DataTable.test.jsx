import { render, screen } from "@testing-library/react";
import DataTable from "./DataTable";
import { describe, it, expect } from "vitest";
import React from "react";

describe("DataTable", () => {
  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Age", accessor: "age" },
  ];

  const data = [
    { name: "John Doe", age: 30 },
    { name: "Jane Doe", age: 25 },
  ];

  it("renders table headers", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("Tidak ada data ditemukan.")).toBeInTheDocument();
  });
});
