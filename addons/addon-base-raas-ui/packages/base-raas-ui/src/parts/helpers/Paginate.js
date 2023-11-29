import React from 'react';
import { Dropdown, Button } from 'semantic-ui-react';

// There is a Pagination component from semantic-ui-react, but I don't like 
// how it looked with the dropdown, so it was simple to make my own.
const Paginate = ({
  entriesPerPage = 25,
  totalEntries = 0,
  currentPage = 1,
  onPageChange = () => { },
  onPerPageChange = () => { },
  children
}) => {
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const perPageOptions = [5, 10, 25, 50].map(count => ({ value: count, text: `${count}  Items per page` }));

  function handlePageChange(number) {
    return () => onPageChange(number);
  }

  function handlePerPageChange(_, { value }) {
    onPerPageChange(value);
  }

  return (
    <>
      {children}
      <div width="100%" className="ui right aligned container my2 pb2">
        <Button.Group compact basic>
          {totalEntries > entriesPerPage && (
            <>
              <Button
                key="pagination-previous"
                title="Previous page"
                icon="angle left"
                disabled={currentPage === 1}
                onClick={handlePageChange(Math.max(1, currentPage - 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <Button
                  key={`pagination-page-${number}`}
                  active={currentPage === number}
                  onClick={handlePageChange(number)}
                  title={`Page ${number}`}
                >{number}</Button>
              ))}
              <Button
                key="pagination-next"
                title="Next page"
                icon="angle right"
                disabled={currentPage === totalPages}
                onClick={handlePageChange(Math.min(currentPage + 1, totalPages))}
              />
            </>
          )}
          <Button>
            <Dropdown inline
              options={perPageOptions}
              defaultValue={entriesPerPage}
              onChange={handlePerPageChange}
            />
          </Button>
        </Button.Group>
      </div>
    </>
  );
};

export default Paginate;
