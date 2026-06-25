import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableCombobox } from "./SearchableCombobox";

const options = [
  { id: "all", label: "ALL CATEGORIES" },
  { id: "c1", label: "GANPATI" },
  { id: "c2", label: "LAKSHMI" },
];

describe("SearchableCombobox", () => {
  it("shows the placeholder when nothing is selected", () => {
    render(<SearchableCombobox options={options} value="" onChange={vi.fn()} placeholder="Search category..." />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Search category...");
  });

  it("shows the selected option's label on the trigger", () => {
    render(<SearchableCombobox options={options} value="c1" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("GANPATI");
  });

  it("opens the option list when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchableCombobox options={options} value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("ALL CATEGORIES")).toBeInTheDocument();
    expect(screen.getByText("GANPATI")).toBeInTheDocument();
    expect(screen.getByText("LAKSHMI")).toBeInTheDocument();
  });

  it("calls onChange with the option id when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableCombobox options={options} value="" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("GANPATI"));

    expect(onChange).toHaveBeenCalledWith("c1");
  });

  it("calls onChange with an empty string when re-selecting the current value (deselect)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableCombobox options={options} value="c1" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    // The trigger button also reads "GANPATI" once it's selected, so scope
    // the click to the option list itself rather than matching either.
    const panel = screen.getByRole("dialog");
    await user.click(within(panel).getByText("GANPATI"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("filters the option list as the user types", async () => {
    const user = userEvent.setup();
    render(<SearchableCombobox options={options} value="" onChange={vi.fn()} placeholder="Search category..." />);

    await user.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Search category...");
    await user.type(searchInput, "lak");

    expect(screen.getByText("LAKSHMI")).toBeInTheDocument();
    expect(screen.queryByText("GANPATI")).not.toBeInTheDocument();
  });

  it("shows the empty-state message when no option matches the search", async () => {
    const user = userEvent.setup();
    render(
      <SearchableCombobox
        options={options}
        value=""
        onChange={vi.fn()}
        placeholder="Search category..."
        emptyText="No categories found."
      />
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search category..."), "zzz-no-match");

    expect(screen.getByText("No categories found.")).toBeInTheDocument();
  });

  it("offers to create a new option when onCreateNew is provided and nothing matches", async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    render(<SearchableCombobox options={options} value="" onChange={vi.fn()} onCreateNew={onCreateNew} />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Select an option..."), "Brand New Category");

    const createButton = screen.getByText(/Create "Brand New Category"/i);
    await user.click(createButton);

    expect(onCreateNew).toHaveBeenCalledWith("Brand New Category");
  });
});
